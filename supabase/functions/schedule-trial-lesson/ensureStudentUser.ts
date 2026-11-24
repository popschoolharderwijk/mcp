import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse } from '../_shared/http.ts';
import {
	buildStudentAuthCreatePayload,
	resolveExistingStudentUserId,
	resolveTrialStudentPersistAction,
	shouldUpdateStudentPhoneOnCreate,
} from './ensureStudentUserHelpers.ts';

interface StudentParentPayload {
	parent_name: string | null;
	parent_email: string | null;
	parent_phone_number: string | null;
}

interface TrialStudentPayload extends StudentParentPayload {
	date_of_birth: string | null;
}

async function createTrialStudentUser(
	admin: SupabaseClient,
	args: {
		studentEmail: string;
		studentFirstName: string;
		studentLastName: string;
		studentPhone: string | null;
		dateOfBirth: string | null;
	},
): Promise<{ ok: true; studentUserId: string } | { ok: false; response: Response }> {
	const { data: created, error: createErr } = await admin.auth.admin.createUser(buildStudentAuthCreatePayload(args));
	if (createErr || !created.user) {
		console.error('createUser', createErr);
		return { ok: false, response: jsonResponse(500, { error: 'Kon gebruiker niet aanmaken' }) };
	}

	const profilePatch: { phone_number?: string | null; date_of_birth: string | null } = {
		date_of_birth: args.dateOfBirth,
	};
	if (shouldUpdateStudentPhoneOnCreate(args.studentPhone)) {
		profilePatch.phone_number = args.studentPhone;
	}
	await admin.from('profiles').update(profilePatch).eq('user_id', created.user.id);

	return { ok: true, studentUserId: created.user.id };
}

async function resolveTrialStudentUserId(
	admin: SupabaseClient,
	args: {
		studentEmail: string;
		studentFirstName: string;
		studentLastName: string;
		studentPhone: string | null;
		dateOfBirth: string | null;
	},
): Promise<{ ok: true; studentUserId: string; isNewUser: boolean } | { ok: false; response: Response }> {
	const { data: existingProfile } = await admin
		.from('profiles')
		.select('user_id')
		.eq('email', args.studentEmail)
		.maybeSingle();

	const existingUserId = resolveExistingStudentUserId(existingProfile);
	if (existingUserId) return { ok: true, studentUserId: existingUserId, isNewUser: false };

	const created = await createTrialStudentUser(admin, args);
	if (!created.ok) return created;
	return { ok: true, studentUserId: created.studentUserId, isNewUser: true };
}

async function persistTrialStudentRow(
	admin: SupabaseClient,
	studentUserId: string,
	isNewUser: boolean,
	payload: TrialStudentPayload,
): Promise<void> {
	const { data: existingStudent } = await admin
		.from('students')
		.select('user_id')
		.eq('user_id', studentUserId)
		.maybeSingle();

	const action = resolveTrialStudentPersistAction(isNewUser, existingStudent);
	if (action === 'noop') return;

	if (action === 'insert_empty') {
		await admin.from('students').insert({ user_id: studentUserId });
		return;
	}

	const parentPayload: StudentParentPayload = {
		parent_name: payload.parent_name,
		parent_email: payload.parent_email,
		parent_phone_number: payload.parent_phone_number,
	};
	await admin.from('students').insert({ user_id: studentUserId, ...parentPayload });
}

export async function ensureStudentUser(
	admin: SupabaseClient,
	args: {
		studentEmail: string;
		studentFirstName: string;
		studentLastName: string;
		studentPhone: string | null;
		studentPayload: TrialStudentPayload;
	},
): Promise<{ ok: true; studentUserId: string } | { ok: false; response: Response }> {
	const userResult = await resolveTrialStudentUserId(admin, {
		studentEmail: args.studentEmail,
		studentFirstName: args.studentFirstName,
		studentLastName: args.studentLastName,
		studentPhone: args.studentPhone,
		dateOfBirth: args.studentPayload.date_of_birth,
	});
	if (!userResult.ok) return userResult;

	await persistTrialStudentRow(admin, userResult.studentUserId, userResult.isNewUser, args.studentPayload);

	return { ok: true, studentUserId: userResult.studentUserId };
}
