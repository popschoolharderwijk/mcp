import type { StudentFormMode, StudentFormState } from '@/components/students/studentFormTypes';
import { studentRecordFields } from '@/components/students/studentFormTypes';

export type StudentSubmitError = { ok: false; title: string; description?: string };
export type StudentSubmitSuccess = { ok: true; userId?: string };
export type StudentSubmitResult = StudentSubmitError | StudentSubmitSuccess;

export function buildStudentProfileUpdateFields(form: StudentFormState): {
	first_name: string | null;
	last_name: string | null;
	phone_number: string | null;
} {
	return {
		first_name: form.first_name || null,
		last_name: form.last_name || null,
		phone_number: form.phone_number || null,
	};
}

export function buildCreateStudentPayload(
	form: StudentFormState,
	mode: StudentFormMode,
	selectedUserId: string | null,
) {
	return {
		mode,
		existing_user_id: mode === 'existing-user' ? (selectedUserId ?? undefined) : undefined,
		email: form.email,
		first_name: form.first_name || undefined,
		last_name: form.last_name || undefined,
		phone_number: form.phone_number || undefined,
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
