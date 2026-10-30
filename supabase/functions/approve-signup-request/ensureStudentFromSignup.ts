import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse } from '../_shared/http.ts';
import {
	buildSignupAuthCreatePayload,
	buildSignupStudentPayload,
	buildSignupStudentUpdateFields,
	resolveExistingSignupStudentUserId,
	resolveSignupStudentRowMutation,
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

	if (shouldUpdateSignupPhoneOnCreate(reqRow.phone_number)) {
		await admin.from('profiles').update({ phone_number: reqRow.phone_number }).eq('user_id', created.user.id);
	}

	return { ok: true, studentUserId: created.user.id };
}

async function resolveSignupStudentUserId(
	admin: SupabaseClient,
	reqRow: SignupRequestRow,
): Promise<{ ok: true; studentUserId: string } | { ok: false; response: Response }> {
	const { data: existingProfile } = await admin
		.from('profiles')
		.select('user_id')
		.eq('email', reqRow.email)
		.maybeSingle();

	const existingUserId = resolveExistingSignupStudentUserId(existingProfile);
	if (existingUserId) return { ok: true, studentUserId: existingUserId };

	return createSignupStudentUser(admin, reqRow);
}

async function upsertStudentRow(admin: SupabaseClient, studentUserId: string, reqRow: SignupRequestRow): Promise<void> {
	const { data: existingStudent } = await admin
		.from('students')
		.select('user_id')
		.eq('user_id', studentUserId)
		.maybeSingle();

	const studentPayload = buildSignupStudentPayload(studentUserId, reqRow);
	if (resolveSignupStudentRowMutation(existingStudent) === 'update') {
		await admin.from('students').update(buildSignupStudentUpdateFields(reqRow)).eq('user_id', studentUserId);
		return;
	}

	await admin.from('students').insert(studentPayload);
}

async function upsertSignupStudentData(
	admin: SupabaseClient,
	studentUserId: string,
	reqRow: SignupRequestRow,
): Promise<void> {
	await upsertStudentRow(admin, studentUserId, reqRow);
	await admin.from('user_roles').upsert({ user_id: studentUserId, role: 'student' }, { onConflict: 'user_id,role' });
}

export async function ensureStudentFromSignup(
	admin: SupabaseClient,
	reqRow: SignupRequestRow,
): Promise<{ ok: true; studentUserId: string } | { ok: false; response: Response }> {
	const userResult = await resolveSignupStudentUserId(admin, reqRow);
	if (!userResult.ok) return userResult;

	await upsertSignupStudentData(admin, userResult.studentUserId, reqRow);
	return { ok: true, studentUserId: userResult.studentUserId };
}
