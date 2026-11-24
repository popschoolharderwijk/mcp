import type { SupabaseClient } from '@supabase/supabase-js';
import { jsonResponse } from '../_shared/http.ts';
import {
	buildSignupAuthCreatePayload,
	buildSignupProfileUpdateFields,
	buildSignupStudentPayload,
	resolveExistingNonStudentConflictResponse,
	resolveExistingSignupStudentUserId,
	shouldUpdateSignupPhoneOnCreate,
} from './ensureStudentFromSignupHelpers.ts';
import type { SignupRequestRow } from './types.ts';

async function createSignupStudentUser(
	admin: SupabaseClient,
	reqRow: SignupRequestRow,
): Promise<{ ok: true; studentUserId: string } | { ok: false; response: Response }> {
	const { data: created, error: createErr } = await admin.auth.admin.createUser(buildSignupAuthCreatePayload(reqRow));
	if (createErr || !created.user) {
		console.error('createUser error', createErr);
		return { ok: false, response: jsonResponse(500, { error: 'Kon gebruiker niet aanmaken' }) };
	}

	const profilePatch: { phone_number?: string | null; date_of_birth: string | null } = {
		...buildSignupProfileUpdateFields(reqRow),
	};
	if (shouldUpdateSignupPhoneOnCreate(reqRow.phone_number)) {
		profilePatch.phone_number = reqRow.phone_number;
	}
	await admin.from('profiles').update(profilePatch).eq('user_id', created.user.id);

	return { ok: true, studentUserId: created.user.id };
}

async function resolveSignupStudentUserId(
	admin: SupabaseClient,
	reqRow: SignupRequestRow,
): Promise<{ ok: true; studentUserId: string; isNewUser: boolean } | { ok: false; response: Response }> {
	const { data: existingProfile } = await admin
		.from('profiles')
		.select('user_id')
		.eq('email', reqRow.email)
		.maybeSingle();

	const existingUserId = resolveExistingSignupStudentUserId(existingProfile);
	if (existingUserId) return { ok: true, studentUserId: existingUserId, isNewUser: false };

	const created = await createSignupStudentUser(admin, reqRow);
	if (!created.ok) return created;
	return { ok: true, studentUserId: created.studentUserId, isNewUser: true };
}

async function persistSignupStudentData(
	admin: SupabaseClient,
	studentUserId: string,
	isNewUser: boolean,
	reqRow: SignupRequestRow,
): Promise<{ ok: true } | { ok: false; response: Response }> {
	if (isNewUser) {
		await admin.from('students').insert(buildSignupStudentPayload(studentUserId, reqRow));
		return { ok: true };
	}

	const { data: existingStudent } = await admin
		.from('students')
		.select('user_id')
		.eq('user_id', studentUserId)
		.maybeSingle();

	if (!existingStudent) {
		const conflict = resolveExistingNonStudentConflictResponse();
		return { ok: false, response: jsonResponse(conflict.status, { error: conflict.error }) };
	}

	return { ok: true };
}

export async function ensureStudentFromSignup(
	admin: SupabaseClient,
	reqRow: SignupRequestRow,
): Promise<{ ok: true; studentUserId: string } | { ok: false; response: Response }> {
	const userResult = await resolveSignupStudentUserId(admin, reqRow);
	if (!userResult.ok) return userResult;

	const persist = await persistSignupStudentData(admin, userResult.studentUserId, userResult.isNewUser, reqRow);
	if (!persist.ok) return persist;

	return { ok: true, studentUserId: userResult.studentUserId };
}
