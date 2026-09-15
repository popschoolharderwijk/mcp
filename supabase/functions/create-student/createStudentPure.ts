import { isValidCreateUserEmail } from '../_shared/create-user-validation.ts';
import { UUID_RE } from '../_shared/http.ts';

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
	if (!body.email) return 'Email is verplicht';
	if (!isValidCreateUserEmail(body.email)) return 'Ongeldig e-mailadres';
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
		parent_name: body.parent_name ?? null,
		parent_email: body.parent_email ?? null,
		parent_phone_number: body.parent_phone_number ?? null,
		debtor_info_same_as_student: body.debtor_info_same_as_student,
		debtor_name: body.debtor_info_same_as_student ? null : (body.debtor_name ?? null),
		debtor_address: body.debtor_info_same_as_student ? null : (body.debtor_address ?? null),
		debtor_postal_code: body.debtor_info_same_as_student ? null : (body.debtor_postal_code ?? null),
		debtor_city: body.debtor_info_same_as_student ? null : (body.debtor_city ?? null),
	};
}

export function buildStudentProfileFields(body: CreateStudentRequestBody) {
	return {
		first_name: body.first_name ?? null,
		last_name: body.last_name ?? null,
		phone_number: body.phone_number ?? null,
	};
}

export function buildStudentAuthCreatePayload(body: CreateStudentRequestBody) {
	return {
		email: body.email,
		email_confirm: true,
		user_metadata: {
			first_name: body.first_name ?? null,
			last_name: body.last_name ?? null,
		},
	};
}

export function resolveExistingStudentUserId(body: CreateStudentRequestBody): string | null {
	if (body.mode === 'existing-user' && body.existing_user_id) return body.existing_user_id;
	return null;
}
