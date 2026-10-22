import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse } from '../_shared/http.ts';
import {
	buildStudentAuthCreatePayload,
	resolveExistingStudentUserId,
	resolveStudentRowMutation,
	shouldUpdateStudentPhoneOnCreate,
} from './ensureStudentUserHelpers.ts';

interface StudentPayload {
	date_of_birth: string | null;
	parent_name: string | null;
	parent_email: string | null;
	parent_phone_number: string | null;
}

async function createTrialStudentUser(
	admin: SupabaseClient,
	args: {
		studentEmail: string;
		studentFirstName: string;
		studentLastName: string;
		studentPhone: string | null;
	},
): Promise<{ ok: true; studentUserId: string } | { ok: false; response: Response }> {
	const { data: created, error: createErr } = await admin.auth.admin.createUser(buildStudentAuthCreatePayload(args));
	if (createErr || !created.user) {
		console.error('createUser', createErr);
		return { ok: false, response: jsonResponse(500, { error: 'Kon gebruiker niet aanmaken' }) };
	}

	if (shouldUpdateStudentPhoneOnCreate(args.studentPhone)) {
		await admin.from('profiles').update({ phone_number: args.studentPhone }).eq('user_id', created.user.id);
	}

	return { ok: true, studentUserId: created.user.id };
}

async function resolveTrialStudentUserId(
	admin: SupabaseClient,
	args: {
		studentEmail: string;
		studentFirstName: string;
		studentLastName: string;
		studentPhone: string | null;
	},
): Promise<{ ok: true; studentUserId: string } | { ok: false; response: Response }> {
	const { data: existingProfile } = await admin
		.from('profiles')
		.select('user_id')
		.eq('email', args.studentEmail)
		.maybeSingle();

	const existingUserId = resolveExistingStudentUserId(existingProfile);
	if (existingUserId) return { ok: true, studentUserId: existingUserId };

	return createTrialStudentUser(admin, args);
}

async function upsertTrialStudentRow(
	admin: SupabaseClient,
	studentUserId: string,
	studentPayload: StudentPayload,
): Promise<void> {
	const { data: existingStudent } = await admin
		.from('students')
		.select('user_id')
		.eq('user_id', studentUserId)
		.maybeSingle();

	if (resolveStudentRowMutation(existingStudent) === 'update') {
		await admin.from('students').update(studentPayload).eq('user_id', studentUserId);
		return;
	}

	await admin.from('students').insert({ user_id: studentUserId, ...studentPayload });
}

export async function ensureStudentUser(
	admin: SupabaseClient,
	args: {
		studentEmail: string;
		studentFirstName: string;
		studentLastName: string;
		studentPhone: string | null;
		studentPayload: StudentPayload;
	},
): Promise<{ ok: true; studentUserId: string } | { ok: false; response: Response }> {
	const userResult = await resolveTrialStudentUserId(admin, args);
	if (!userResult.ok) return userResult;

	await upsertTrialStudentRow(admin, userResult.studentUserId, args.studentPayload);
	await admin
		.from('user_roles')
		.upsert({ user_id: userResult.studentUserId, role: 'student' }, { onConflict: 'user_id,role' });

	return { ok: true, studentUserId: userResult.studentUserId };
}
