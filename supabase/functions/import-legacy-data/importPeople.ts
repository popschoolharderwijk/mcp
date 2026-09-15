import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getSafeErrorMessage } from '../_shared/errors.ts';
import { resolveLegacyPersonUserId, saveLegacyMapping } from '../_shared/legacy-import.ts';
import {
	buildLegacyStudentUpsertRow,
	buildUnknownLessonTypeLegacyIdError,
	findAuthUserIdInList,
	parseLessonTypeLegacyIds,
	resolveAuthUserCreateFailureMessage,
	resolveCreatedAuthUserId,
	resolveLegacyTeacherImportOutcome,
	shouldLookupDuplicateAuthUser,
	shouldStopAuthUserPagination,
} from './importPeoplePure.ts';
import type { ImportSummary, RowError, StudentImportRow, TeacherImportRow } from './types.ts';

async function findAuthUserByEmail(admin: SupabaseClient, email: string): Promise<string | null> {
	const perPage = 1000;
	for (let page = 1; page <= 20; page++) {
		const found = await findAuthUserIdOnPage(admin, email, page, perPage);
		if (found.status === 'found') return found.userId;
		if (found.status === 'done') return null;
	}
	return null;
}

async function findAuthUserIdOnPage(
	admin: SupabaseClient,
	email: string,
	page: number,
	perPage: number,
): Promise<{ status: 'found'; userId: string } | { status: 'continue' } | { status: 'done' }> {
	const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
	if (error) throw error;
	const userId = findAuthUserIdInList(data.users, email);
	if (userId) return { status: 'found', userId };
	if (shouldStopAuthUserPagination(data.users.length, perPage)) return { status: 'done' };
	return { status: 'continue' };
}

async function ensureAuthUser(
	admin: SupabaseClient,
	email: string,
	firstName: string | null | undefined,
	lastName: string | null | undefined,
): Promise<string> {
	const created = await admin.auth.admin.createUser({
		email,
		email_confirm: true,
		user_metadata: { first_name: firstName ?? null, last_name: lastName ?? null },
	});
	return resolveAuthUserIdFromCreateResult(admin, email, created.data, created.error);
}

async function resolveAuthUserIdFromCreateResult(
	admin: SupabaseClient,
	email: string,
	created: { user: { id: string } | null } | null,
	error: { message: string } | null,
): Promise<string> {
	const userId = resolveCreatedAuthUserId(created);
	if (userId) return userId;

	const duplicateUserId = await lookupDuplicateAuthUserId(admin, email, error?.message);
	if (duplicateUserId) return duplicateUserId;

	throw resolveAuthUserCreateFailureMessage(error);
}

async function lookupDuplicateAuthUserId(
	admin: SupabaseClient,
	email: string,
	errorMessage: string | undefined,
): Promise<string | null> {
	if (!shouldLookupDuplicateAuthUser(errorMessage)) return null;
	return findAuthUserByEmail(admin, email);
}

async function linkTeacherLessonTypes(
	admin: SupabaseClient,
	row: TeacherImportRow,
	userId: string,
	typeMap: Map<string, string>,
	rowIndex: number,
	errors: RowError[],
): Promise<void> {
	const wantedLegacyIds = parseLessonTypeLegacyIds(row.lesson_type_legacy_ids);
	if (wantedLegacyIds.length === 0) return;

	for (const lid of wantedLegacyIds) {
		const ltId = typeMap.get(lid);
		if (!ltId) {
			errors.push(buildUnknownLessonTypeLegacyIdError(rowIndex, lid));
			continue;
		}
		await admin
			.from('teacher_lesson_types')
			.upsert(
				{ teacher_user_id: userId, lesson_type_id: ltId },
				{ onConflict: 'teacher_user_id,lesson_type_id' },
			);
	}
}

async function importTeacherRow(
	admin: SupabaseClient,
	row: TeacherImportRow,
	rowIndex: number,
	teacherMap: Map<string, string>,
	typeMap: Map<string, string>,
	importedBy: string | null,
	errors: RowError[],
): Promise<'created' | 'updated'> {
	const hadMapping = teacherMap.has(row.legacy_id);
	const { userId } = await resolveLegacyPersonUserId({
		admin,
		personMap: teacherMap,
		legacyId: row.legacy_id,
		email: row.email,
		firstName: row.first_name,
		lastName: row.last_name,
		phone: row.phone_number,
		role: 'teacher',
		ensureAuthUser,
	});
	await upsertImportedTeacherRow(admin, row, userId);
	await linkTeacherLessonTypes(admin, row, userId, typeMap, rowIndex, errors);

	if (!hadMapping) {
		await saveLegacyMapping(admin, 'teacher', row.legacy_id, userId, importedBy);
		teacherMap.set(row.legacy_id, userId);
	}
	return resolveLegacyTeacherImportOutcome(hadMapping);
}

async function upsertImportedTeacherRow(admin: SupabaseClient, row: TeacherImportRow, userId: string): Promise<void> {
	const { error: tErr } = await admin
		.from('teachers')
		.upsert({ user_id: userId, bio: row.bio ?? null, is_active: row.is_active ?? true }, { onConflict: 'user_id' });
	if (tErr) throw tErr;
}

async function importStudentRow(
	admin: SupabaseClient,
	row: StudentImportRow,
	studentMap: Map<string, string>,
	importedBy: string | null,
): Promise<'created' | 'updated'> {
	const hadMapping = studentMap.has(row.legacy_id);
	const { userId } = await resolveLegacyPersonUserId({
		admin,
		personMap: studentMap,
		legacyId: row.legacy_id,
		email: row.email,
		firstName: row.first_name,
		lastName: row.last_name,
		phone: row.phone_number,
		role: 'student',
		ensureAuthUser,
	});
	const { error: sErr } = await admin
		.from('students')
		.upsert({ user_id: userId, ...buildLegacyStudentUpsertRow(row) }, { onConflict: 'user_id' });
	if (sErr) throw sErr;

	if (!hadMapping) {
		await saveLegacyMapping(admin, 'student', row.legacy_id, userId, importedBy);
		studentMap.set(row.legacy_id, userId);
		return 'created';
	}
	return 'updated';
}

export async function importTeachers(
	admin: SupabaseClient,
	rows: TeacherImportRow[],
	teacherMap: Map<string, string>,
	typeMap: Map<string, string>,
	importedBy: string | null,
	errors: RowError[],
): Promise<ImportSummary> {
	const summary: ImportSummary = { tab: 'teachers', created: 0, updated: 0, failed: 0 };
	for (const [i, row] of rows.entries()) {
		try {
			const outcome = await importTeacherRow(admin, row, i, teacherMap, typeMap, importedBy, errors);
			if (outcome === 'created') summary.created++;
			else summary.updated++;
		} catch (err) {
			summary.failed++;
			errors.push({ tab: 'teachers', row: i + 2, message: getSafeErrorMessage(err) });
		}
	}
	return summary;
}

export async function importStudents(
	admin: SupabaseClient,
	rows: StudentImportRow[],
	studentMap: Map<string, string>,
	importedBy: string | null,
	errors: RowError[],
): Promise<ImportSummary> {
	const summary: ImportSummary = { tab: 'students', created: 0, updated: 0, failed: 0 };
	for (const [i, row] of rows.entries()) {
		try {
			const outcome = await importStudentRow(admin, row, studentMap, importedBy);
			if (outcome === 'created') summary.created++;
			else summary.updated++;
		} catch (err) {
			summary.failed++;
			errors.push({ tab: 'students', row: i + 2, message: getSafeErrorMessage(err) });
		}
	}
	return summary;
}
