import type { StudentFormMode, StudentFormState } from '@/components/students/studentFormTypes';
import { studentRecordFields } from '@/components/students/studentFormTypes';
import {
	normalizeCompactText,
	normalizeCompactTextOrNull,
	normalizeTrimmedText,
	normalizeTrimmedTextOrNull,
} from '@/lib/text/normalizeText';

export type StudentSubmitError = { ok: false; title: string; description?: string };
export type StudentSubmitSuccess = { ok: true; userId?: string };
export type StudentSubmitResult = StudentSubmitError | StudentSubmitSuccess;

export function buildStudentProfileUpdateFields(form: StudentFormState): {
	first_name: string | null;
	last_name: string | null;
	phone_number: string | null;
} {
	return {
		first_name: normalizeCompactTextOrNull(form.first_name),
		last_name: normalizeCompactTextOrNull(form.last_name),
		phone_number: normalizeTrimmedTextOrNull(form.phone_number),
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
