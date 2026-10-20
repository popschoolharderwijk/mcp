// Edge function: legacy data import.
// Actions: template | validate | import.
// Only admins / site_admins.
// Idempotent via public.legacy_ids mapping table.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as XLSX from 'npm:xlsx@0.18.5';
import { z } from 'npm:zod@3.23.8';
import { corsHeaders } from '../_shared/cors.ts';
import { getSafeErrorMessage } from '../_shared/errors.ts';
import { upsertMappedEntity } from '../_shared/legacy-import.ts';
import { handleLegacyImportRequest } from './handler.ts';
import {
	buildAgreementImportReferenceError,
	buildLegacyAgreementUpsertPayload,
	resolveAgreementImportReferences,
} from './importAgreementsPure.ts';
import {
	buildLegacyLessonTypeImportError,
	buildLegacyLessonTypeOptionImportError,
	buildLegacyLessonTypeOptionPayload,
	buildLegacyLessonTypePayload,
	resolveLessonTypeOptionLessonTypeId,
} from './importLessonTypesPure.ts';
import { importStudents, importTeachers } from './importPeople.ts';
import type { ImportSummary, RowError, StudentImportRow, Tab, TeacherImportRow } from './types.ts';
import { TABS } from './types.ts';

const FREQ = z.enum(['daily', 'weekly', 'biweekly', 'monthly']);

const lessonTypeSchema = z.object({
	legacy_id: z.string().min(1),
	name: z.string().min(1),
	icon: z.string().min(1),
	color: z.string().min(1),
	is_group_lesson: z.coerce.boolean().optional().default(false),
	cost_center: z.string().optional().nullable(),
	description: z.string().optional().nullable(),
	is_active: z.coerce.boolean().optional().default(true),
});

const lessonTypeOptionSchema = z.object({
	legacy_id: z.string().min(1),
	lesson_type_legacy_id: z.string().min(1),
	frequency: FREQ,
	duration_minutes: z.coerce.number().int().positive(),
});

const personLegacySchema = z.object({
	legacy_id: z.string().min(1),
	email: z.string().email(),
	first_name: z.string().optional().nullable(),
	last_name: z.string().optional().nullable(),
	phone_number: z.string().optional().nullable(),
});

const teacherSchema = personLegacySchema.extend({
	bio: z.string().optional().nullable(),
	is_active: z.coerce.boolean().optional().default(true),
	lesson_type_legacy_ids: z.string().optional().nullable(), // pipe-separated
});

const studentSchema = personLegacySchema.extend({
	date_of_birth: z.string().optional().nullable(),
	parent_name: z.string().optional().nullable(),
	parent_email: z.string().email().optional().nullable().or(z.literal('')),
	parent_phone_number: z.string().optional().nullable(),
	debtor_info_same_as_student: z.coerce.boolean().optional().default(true),
	debtor_name: z.string().optional().nullable(),
	debtor_address: z.string().optional().nullable(),
	debtor_postal_code: z.string().optional().nullable(),
	debtor_city: z.string().optional().nullable(),
});

const agreementSchema = z.object({
	legacy_id: z.string().min(1),
	student_legacy_id: z.string().min(1),
	teacher_legacy_id: z.string().min(1),
	lesson_type_legacy_id: z.string().min(1),
	duration_minutes: z.coerce.number().int().positive(),
	frequency: FREQ,
	day_of_week: z.coerce.number().int().min(0).max(6),
	start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
	start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	end_date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional()
		.nullable()
		.or(z.literal('')),
	notes: z.string().optional().nullable(),
	signup_source: z.string().optional().nullable(),
});

function sheetRows(wb: XLSX.WorkBook, name: string): Record<string, unknown>[] {
	const sheet = wb.Sheets[name];
	if (!sheet) return [];
	return XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false });
}

function buildTemplate(): Uint8Array {
	const wb = XLSX.utils.book_new();
	const headers: Record<Tab, string[]> = {
		lesson_types: [
			'legacy_id',
			'name',
			'icon',
			'color',
			'is_group_lesson',
			'cost_center',
			'description',
			'is_active',
		],
		lesson_type_options: [
			'legacy_id',
			'lesson_type_legacy_id',
			'frequency',
			'duration_minutes',
		],
		teachers: [
			'legacy_id',
			'email',
			'first_name',
			'last_name',
			'phone_number',
			'bio',
			'is_active',
			'lesson_type_legacy_ids',
		],
		students: [
			'legacy_id',
			'email',
			'first_name',
			'last_name',
			'phone_number',
			'date_of_birth',
			'parent_name',
			'parent_email',
			'parent_phone_number',
			'debtor_info_same_as_student',
			'debtor_name',
			'debtor_address',
			'debtor_postal_code',
			'debtor_city',
		],
		lesson_agreements: [
			'legacy_id',
			'student_legacy_id',
			'teacher_legacy_id',
			'lesson_type_legacy_id',
			'duration_minutes',
			'frequency',
			'day_of_week',
			'start_time',
			'start_date',
			'end_date',
			'notes',
			'signup_source',
		],
	};
	for (const tab of TABS) {
		const ws = XLSX.utils.aoa_to_sheet([headers[tab]]);
		XLSX.utils.book_append_sheet(wb, ws, tab);
	}
	return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
}

function validateWorkbook(wb: XLSX.WorkBook): { rows: Record<Tab, unknown[]>; errors: RowError[] } {
	const errors: RowError[] = [];
	const out: Record<Tab, unknown[]> = {
		lesson_types: [],
		lesson_type_options: [],
		teachers: [],
		students: [],
		lesson_agreements: [],
	};
	const schemas: Record<Tab, z.ZodSchema> = {
		lesson_types: lessonTypeSchema,
		lesson_type_options: lessonTypeOptionSchema,
		teachers: teacherSchema,
		students: studentSchema,
		lesson_agreements: agreementSchema,
	};
	for (const tab of TABS) {
		const raw = sheetRows(wb, tab);
		raw.forEach((row, idx) => {
			const result = schemas[tab].safeParse(row);
			if (result.success) {
				out[tab].push(result.data);
			} else {
				for (const issue of result.error.issues) {
					errors.push({
						tab,
						row: idx + 2, // header on row 1, data starts row 2
						field: issue.path.join('.'),
						message: issue.message,
					});
				}
			}
		});
	}
	// Cross-tab referential checks
	const lessonTypeIds = new Set((out.lesson_types as { legacy_id: string }[]).map((x) => x.legacy_id));
	const teacherIds = new Set((out.teachers as { legacy_id: string }[]).map((x) => x.legacy_id));
	const studentIds = new Set((out.students as { legacy_id: string }[]).map((x) => x.legacy_id));
	(out.lesson_type_options as { lesson_type_legacy_id: string }[]).forEach((row, idx) => {
		if (!lessonTypeIds.has(row.lesson_type_legacy_id)) {
			errors.push({
				tab: 'lesson_type_options',
				row: idx + 2,
				field: 'lesson_type_legacy_id',
				message: `Onbekende lesson_type_legacy_id: ${row.lesson_type_legacy_id}`,
			});
		}
	});
	(
		out.lesson_agreements as {
			student_legacy_id: string;
			teacher_legacy_id: string;
			lesson_type_legacy_id: string;
		}[]
	).forEach((row, idx) => {
		if (!studentIds.has(row.student_legacy_id))
			errors.push({ tab: 'lesson_agreements', row: idx + 2, field: 'student_legacy_id', message: 'Onbekend' });
		if (!teacherIds.has(row.teacher_legacy_id))
			errors.push({ tab: 'lesson_agreements', row: idx + 2, field: 'teacher_legacy_id', message: 'Onbekend' });
		if (!lessonTypeIds.has(row.lesson_type_legacy_id))
			errors.push({
				tab: 'lesson_agreements',
				row: idx + 2,
				field: 'lesson_type_legacy_id',
				message: 'Onbekend',
			});
	});
	return { rows: out, errors };
}

// ---------- Legacy mapping helpers ----------

async function getMapping(admin: SupabaseClient, entity: string): Promise<Map<string, string>> {
	const map = new Map<string, string>();
	const { data, error } = await admin.from('legacy_ids').select('legacy_id, new_id').eq('entity_type', entity);
	if (error) throw error;
	for (const r of data ?? []) map.set(r.legacy_id, r.new_id);
	return map;
}

async function importLessonTypes(
	admin: SupabaseClient,
	rows: z.infer<typeof lessonTypeSchema>[],
	mapping: Map<string, string>,
	importedBy: string | null,
	errors: RowError[],
): Promise<ImportSummary> {
	const summary: ImportSummary = { tab: 'lesson_types', created: 0, updated: 0, failed: 0 };
	for (const [i, row] of rows.entries()) {
		try {
			await upsertMappedEntity({
				admin,
				table: 'lesson_types',
				entityType: 'lesson_type',
				legacyId: row.legacy_id,
				mapping,
				importedBy,
				payload: buildLegacyLessonTypePayload(row),
				summary,
			});
		} catch (err) {
			summary.failed++;
			errors.push(buildLegacyLessonTypeImportError('lesson_types', i + 2, getSafeErrorMessage(err)));
		}
	}
	return summary;
}

async function importLessonTypeOptions(
	admin: SupabaseClient,
	rows: z.infer<typeof lessonTypeOptionSchema>[],
	typeMap: Map<string, string>,
	mapping: Map<string, string>,
	importedBy: string | null,
	errors: RowError[],
): Promise<ImportSummary> {
	const summary: ImportSummary = { tab: 'lesson_type_options', created: 0, updated: 0, failed: 0 };
	for (const [i, row] of rows.entries()) {
		try {
			const lessonTypeId = resolveLessonTypeOptionLessonTypeId(typeMap, row.lesson_type_legacy_id);
			const payload = buildLegacyLessonTypeOptionPayload(row, lessonTypeId);
			await upsertMappedEntity({
				admin,
				table: 'lesson_type_options',
				entityType: 'lesson_type_option',
				legacyId: row.legacy_id,
				mapping,
				importedBy,
				payload,
				summary,
			});
		} catch (err) {
			summary.failed++;
			errors.push(buildLegacyLessonTypeOptionImportError(i + 2, getSafeErrorMessage(err)));
		}
	}
	return summary;
}

async function importAgreements(
	admin: SupabaseClient,
	rows: z.infer<typeof agreementSchema>[],
	agreementMap: Map<string, string>,
	studentMap: Map<string, string>,
	teacherMap: Map<string, string>,
	typeMap: Map<string, string>,
	importedBy: string | null,
	errors: RowError[],
): Promise<ImportSummary> {
	const summary: ImportSummary = { tab: 'lesson_agreements', created: 0, updated: 0, failed: 0 };
	for (const [i, row] of rows.entries()) {
		try {
			const refs = resolveAgreementImportReferences(row, studentMap, teacherMap, typeMap);
			if (!refs) throw buildAgreementImportReferenceError();
			const payload = buildLegacyAgreementUpsertPayload(row, refs);
			await upsertMappedEntity({
				admin,
				table: 'lesson_agreements',
				entityType: 'lesson_agreement',
				legacyId: row.legacy_id,
				mapping: agreementMap,
				importedBy,
				payload,
				summary,
			});
		} catch (err) {
			summary.failed++;
			errors.push({ tab: 'lesson_agreements', row: i + 2, message: getSafeErrorMessage(err) });
		}
	}
	return summary;
}

async function runEntityImports(
	admin: SupabaseClient,
	rows: Record<Tab, unknown[]>,
	userId: string,
): Promise<{ summaries: ImportSummary[]; errors: RowError[] }> {
	const importErrors: RowError[] = [];
	const typeMap = await getMapping(admin, 'lesson_type');
	const optionMap = await getMapping(admin, 'lesson_type_option');
	const teacherMap = await getMapping(admin, 'teacher');
	const studentMap = await getMapping(admin, 'student');
	const agreementMap = await getMapping(admin, 'lesson_agreement');

	const summaries = [
		await importLessonTypes(
			admin,
			rows.lesson_types as z.infer<typeof lessonTypeSchema>[],
			typeMap,
			userId,
			importErrors,
		),
		await importLessonTypeOptions(
			admin,
			rows.lesson_type_options as z.infer<typeof lessonTypeOptionSchema>[],
			typeMap,
			optionMap,
			userId,
			importErrors,
		),
		await importTeachers(admin, rows.teachers as TeacherImportRow[], teacherMap, typeMap, userId, importErrors),
		await importStudents(admin, rows.students as StudentImportRow[], studentMap, userId, importErrors),
		await importAgreements(
			admin,
			rows.lesson_agreements as z.infer<typeof agreementSchema>[],
			agreementMap,
			studentMap,
			teacherMap,
			typeMap,
			userId,
			importErrors,
		),
	];

	return { summaries, errors: importErrors };
}

Deno.serve(async (req) => {
	if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
	return handleLegacyImportRequest(req, { buildTemplate, validateWorkbook, runEntityImports });
});
