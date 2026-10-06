import { isValidCreateUserEmail } from '../_shared/create-user-validation.ts';
import { UUID_RE } from '../_shared/http.ts';
import { compactOrNull, trimOrNull } from '../_shared/normalizeTextPure.ts';

export type CreateStudentMode = 'new-user' | 'existing-user';

export interface CreateStudentRequestBody {
	mode: CreateStudentMode;
	existing_user_id?: string;
	email: string;
	first_name?: string;
	last_name?: string;
	phone_number?: string;
	date_of_birth?: string | null;
	parent_name?: string | null;
	parent_email?: string | null;
	parent_phone_number?: string | null;
	debtor_info_same_as_student: boolean;
	debtor_name?: string | null;
	debtor_address?: string | null;
	debtor_postal_code?: string | null;
	debtor_city?: string | null;
}

export function validateCreateStudentBody(body: CreateStudentRequestBody): string | null {
	const email = (body.email ?? '').trim();
	if (!email) return 'Email is verplicht';
	if (!isValidCreateUserEmail(email)) return 'Ongeldig e-mailadres';
	if (body.mode !== 'new-user' && body.mode !== 'existing-user') return 'Ongeldige modus';
	if (body.mode === 'existing-user') {
		if (!body.existing_user_id) return 'Selecteer een gebruiker';
		if (!UUID_RE.test(body.existing_user_id)) return 'Ongeldige gebruiker';
	}
	return null;
}

export function buildStudentRowFields(body: CreateStudentRequestBody) {
	return {
		date_of_birth: body.date_of_birth ?? null,
		parent_name: compactOrNull(body.parent_name),
		parent_email: trimOrNull(body.parent_email),
		parent_phone_number: trimOrNull(body.parent_phone_number),
		debtor_info_same_as_student: body.debtor_info_same_as_student,
		debtor_name: body.debtor_info_same_as_student ? null : compactOrNull(body.debtor_name),
		debtor_address: body.debtor_info_same_as_student ? null : compactOrNull(body.debtor_address),
		debtor_postal_code: body.debtor_info_same_as_student ? null : compactOrNull(body.debtor_postal_code),
		debtor_city: body.debtor_info_same_as_student ? null : compactOrNull(body.debtor_city),
	};
}

export function buildStudentProfileFields(body: CreateStudentRequestBody) {
	return {
		first_name: compactOrNull(body.first_name),
		last_name: compactOrNull(body.last_name),
		phone_number: trimOrNull(body.phone_number),
	};
}

export function buildStudentAuthCreatePayload(body: CreateStudentRequestBody) {
	return {
		email: body.email.trim(),
		email_confirm: true,
		user_metadata: {
			first_name: compactOrNull(body.first_name),
			last_name: compactOrNull(body.last_name),
		},
	};
}

export function resolveExistingStudentUserId(body: CreateStudentRequestBody): string | null {
	if (body.mode === 'existing-user' && body.existing_user_id) return body.existing_user_id;
	return null;
}
