import type { StudentFormMode, StudentFormState } from '@/components/students/studentFormTypes';
import { studentRecordFields } from '@/components/students/studentFormTypes';
import type { StudentFormSaveScope } from '@/components/students/studentFormValidation';
import { buildProfileAddressUpdateFields } from '@/lib/profile/profileAddressHelpers';
import {
	normalizeCompactText,
	normalizeCompactTextOrNull,
	normalizeTrimmedText,
	normalizeTrimmedTextOrNull,
} from '@/lib/text/normalizeText';

export type StudentSubmitError = { ok: false; title: string; description?: string };
export type StudentSubmitSuccess = { ok: true; userId?: string };
export type StudentSubmitResult = StudentSubmitError | StudentSubmitSuccess;

/** Profiles columns to update for a scoped save; null when that scope does not touch profiles. */
export function buildStudentProfileUpdateFields(form: StudentFormState, scope: StudentFormSaveScope) {
	if (scope === 'address') {
		return buildProfileAddressUpdateFields(form);
	}
	if (scope === 'parent') {
		return null;
	}
	return {
		first_name: normalizeCompactTextOrNull(form.first_name),
		last_name: normalizeCompactTextOrNull(form.last_name),
		phone_number: normalizeTrimmedTextOrNull(form.phone_number),
	};
}

/** Students columns to update for a scoped save; null when that scope does not touch students. */
export function buildStudentRecordUpdateFields(form: StudentFormState, scope: StudentFormSaveScope) {
	if (scope === 'address') {
		return null;
	}
	const fields = studentRecordFields(form);
	if (scope === 'parent') {
		return {
			parent_name: fields.parent_name,
			parent_email: fields.parent_email,
			parent_phone_number: fields.parent_phone_number,
		};
	}
	return {
		date_of_birth: fields.date_of_birth,
		debtor_info_same_as_student: fields.debtor_info_same_as_student,
		debtor_name: fields.debtor_name,
		debtor_address: fields.debtor_address,
		debtor_postal_code: fields.debtor_postal_code,
		debtor_city: fields.debtor_city,
	};
}

export function buildCreateStudentPayload(
	form: StudentFormState,
	mode: StudentFormMode,
	selectedUserId: string | null,
) {
	const email = normalizeTrimmedText(form.email);
	const firstName = normalizeCompactText(form.first_name);
	const lastName = normalizeCompactText(form.last_name);
	const phoneNumber = normalizeTrimmedText(form.phone_number);
	return {
		mode,
		existing_user_id: mode === 'existing-user' ? (selectedUserId ?? undefined) : undefined,
		email,
		first_name: firstName || undefined,
		last_name: lastName || undefined,
		phone_number: phoneNumber || undefined,
		...studentRecordFields(form),
	};
}

export function resolveCreateStudentInvokeResult(data: unknown): StudentSubmitResult {
	const payload = data as { error?: string; user_id?: string } | null;
	if (payload?.error) {
		return {
			ok: false,
			title: 'Fout bij aanmaken leerling',
			description: payload.error,
		};
	}
	if (!payload?.user_id) {
		return {
			ok: false,
			title: 'Fout bij aanmaken leerling',
			description: 'Onbekende fout',
		};
	}
	return { ok: true, userId: payload.user_id };
}
