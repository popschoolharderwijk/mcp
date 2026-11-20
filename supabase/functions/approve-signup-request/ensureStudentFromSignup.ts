import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse } from '../_shared/http.ts';
import {
	buildChildMemberProfileInsert,
	buildMemberMembershipInsert,
	buildSignupAuthCreatePayload,
	buildSignupStudentPayload,
	buildSignupStudentUpdateFields,
	isParentOwnedSignup,
	resolveAuthCreateUserId,
	resolveExistingSignupStudentUserId,
	resolveSignupLoginEmail,
	resolveSignupStudentRowMutation,
	shouldApplySignupPhoneOnCreate,
} from './ensureStudentFromSignupHelpers.ts';
import type { SignupRequestRow } from './types.ts';

async function createSignupLoginUser(
	admin: SupabaseClient,
	reqRow: SignupRequestRow,
): Promise<{ ok: true; loginUserId: string } | { ok: false; response: Response }> {
	const { data: created, error: createErr } = await admin.auth.admin.createUser(buildSignupAuthCreatePayload(reqRow));
	const loginUserId = resolveAuthCreateUserId(created, createErr);
	if (loginUserId == null) {
		console.error('createUser error', createErr);
		return { ok: false, response: jsonResponse(500, { error: 'Kon gebruiker niet aanmaken' }) };
	}

	if (shouldApplySignupPhoneOnCreate(reqRow)) {
		await admin.from('profiles').update({ phone_number: reqRow.phone_number }).eq('user_id', loginUserId);
	}

	return { ok: true, loginUserId };
}

async function resolveSignupLoginUserId(
	admin: SupabaseClient,
	reqRow: SignupRequestRow,
): Promise<{ ok: true; loginUserId: string } | { ok: false; response: Response }> {
	const loginEmail = resolveSignupLoginEmail(reqRow);
	const { data: existingProfile } = await admin
		.from('profiles')
		.select('user_id')
		.eq('email', loginEmail)
		.maybeSingle();

	const existingUserId = resolveExistingSignupStudentUserId(existingProfile);
	if (existingUserId) return { ok: true, loginUserId: existingUserId };

	return createSignupLoginUser(admin, reqRow);
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

async function createChildMemberUnderLogin(
	admin: SupabaseClient,
	loginUserId: string,
	reqRow: SignupRequestRow,
): Promise<{ ok: true; studentUserId: string } | { ok: false; response: Response }> {
	const childProfileId = crypto.randomUUID();
	const { error: profileError } = await admin.from('profiles').insert(
		buildChildMemberProfileInsert({
			profileId: childProfileId,
			firstName: reqRow.first_name,
			lastName: reqRow.last_name,
			phoneNumber: reqRow.phone_number,
		}),
	);
	if (profileError) {
		console.error('member profile insert', profileError);
		return { ok: false, response: jsonResponse(500, { error: 'Kon leerlingprofiel niet aanmaken' }) };
	}

	const { error: membershipError } = await admin
		.from('account_memberships')
		.insert(buildMemberMembershipInsert(loginUserId, childProfileId));
	if (membershipError) {
		console.error('member membership insert', membershipError);
		await admin.from('profiles').delete().eq('user_id', childProfileId);
		return { ok: false, response: jsonResponse(500, { error: 'Kon lidmaatschap niet aanmaken' }) };
	}

	await upsertStudentRow(admin, childProfileId, reqRow);
	return { ok: true, studentUserId: childProfileId };
}

async function ensureAdultStudentFromSignup(
	admin: SupabaseClient,
	reqRow: SignupRequestRow,
): Promise<{ ok: true; studentUserId: string } | { ok: false; response: Response }> {
	const loginResult = await resolveSignupLoginUserId(admin, reqRow);
	if (!loginResult.ok) return loginResult;

	await upsertStudentRow(admin, loginResult.loginUserId, reqRow);
	return { ok: true, studentUserId: loginResult.loginUserId };
}

export async function ensureStudentFromSignup(
	admin: SupabaseClient,
	reqRow: SignupRequestRow,
): Promise<{ ok: true; studentUserId: string } | { ok: false; response: Response }> {
	if (!isParentOwnedSignup(reqRow)) {
		return ensureAdultStudentFromSignup(admin, reqRow);
	}

	const loginResult = await resolveSignupLoginUserId(admin, reqRow);
	if (!loginResult.ok) return loginResult;

	return createChildMemberUnderLogin(admin, loginResult.loginUserId, reqRow);
}
