import { isValidEmail, isValidPhone, type StudentFormState } from '@/components/students/studentFormTypes';

export type StudentFormSaveScope = 'profile' | 'parent';

function getPersonalContactValidationError(form: StudentFormState): string | null {
	if (form.email && !isValidEmail(form.email)) {
		return 'Ongeldig emailadres';
	}
	if (form.phone_number && !isValidPhone(form.phone_number)) {
		return 'Telefoonnummer moet 10 cijfers bevatten';
	}
	return null;
}

function getParentContactValidationError(form: StudentFormState): string | null {
	if (form.parent_phone_number && !isValidPhone(form.parent_phone_number)) {
		return 'Ouder telefoonnummer moet 10 cijfers bevatten';
	}
	return null;
}

function getDebtorValidationError(form: StudentFormState): string | null {
	if (form.debtor_info_same_as_student) return null;
	if (form.debtor_name && form.debtor_address && form.debtor_postal_code && form.debtor_city) {
		return null;
	}
	return 'Alle debiteur NAW velden zijn verplicht als debiteurinformatie niet gelijk is aan leerlinginformatie';
}

export function getStudentProfileTabValidationError(form: StudentFormState): string | null {
	const contactError = getPersonalContactValidationError(form);
	if (contactError) return contactError;
	return getDebtorValidationError(form);
}

export function getStudentParentTabValidationError(form: StudentFormState): string | null {
	return getParentContactValidationError(form);
}

function getValidationErrorForScope(form: StudentFormState, scope: StudentFormSaveScope): string | null {
	if (scope === 'parent') return getStudentParentTabValidationError(form);
	return getStudentProfileTabValidationError(form);
}

/** Toast message when save should be blocked; null when validation passes. */
export function resolveStudentProfileSaveValidationError(params: {
	form: StudentFormState;
	scope: StudentFormSaveScope;
	dateOfBirthDraftSynced?: boolean;
}): string | null {
	if (params.scope === 'profile' && params.dateOfBirthDraftSynced === false) {
		return 'Geboortedatum is ongeldig';
	}
	return getValidationErrorForScope(params.form, params.scope);
}
