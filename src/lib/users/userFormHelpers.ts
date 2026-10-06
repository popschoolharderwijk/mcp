import type { AppRole } from '@/lib/roles';
import { allRoles } from '@/lib/roles';
import { normalizeCompactText, normalizeTrimmedText } from '@/lib/text/normalizeText';
import type { User } from '@/types/users';

export interface UserFormState {
	email: string;
	first_name: string;
	last_name: string;
	phone_number: string;
	role: AppRole | null;
}

export interface UserFormEditContext {
	user_id: string;
	role: AppRole | null;
}

export type UserFormValidationResult = { ok: true } | { ok: false; message: string; description?: string };

export function trimUserFormState(form: UserFormState): UserFormState {
	return {
		email: normalizeTrimmedText(form.email),
		first_name: normalizeCompactText(form.first_name),
		last_name: normalizeCompactText(form.last_name),
		phone_number: normalizeTrimmedText(form.phone_number),
		role: form.role,
	};
}

export function assignableRoles(isSiteAdmin: boolean): AppRole[] {
	return allRoles.filter((role) => isSiteAdmin || role !== 'site_admin');
}

export function validateUserFormSubmit(form: UserFormState, isSiteAdmin: boolean): UserFormValidationResult {
	const trimmed = trimUserFormState(form);
	if (!trimmed.email) {
		return { ok: false, message: 'Email is verplicht' };
	}
	if (trimmed.role === 'site_admin' && !isSiteAdmin) {
		return {
			ok: false,
			message: 'Geen toegang',
			description: 'Admins kunnen geen site_admin rollen toewijzen.',
		};
	}
	return { ok: true };
}

export function buildProfileUpdatePayload(form: UserFormState) {
	const trimmed = trimUserFormState(form);
	return {
		email: trimmed.email,
		first_name: trimmed.first_name || null,
		last_name: trimmed.last_name || null,
		phone_number: trimmed.phone_number || null,
	};
}

export function buildCreateUserPayload(form: UserFormState) {
	const trimmed = trimUserFormState(form);
	return {
		email: trimmed.email,
		first_name: trimmed.first_name || undefined,
		last_name: trimmed.last_name || undefined,
		phone_number: trimmed.phone_number || undefined,
		role: trimmed.role || undefined,
	};
}

export function buildCreatedUserInfo(form: UserFormState, data: { user_id: string; email?: string }): User {
	const trimmed = trimUserFormState(form);
	return {
		user_id: data.user_id,
		email: data.email ?? trimmed.email,
		first_name: trimmed.first_name || null,
		last_name: trimmed.last_name || null,
		avatar_url: null,
		phone_number: trimmed.phone_number || null,
	};
}

export function getUserFormDialogCopy(isEditMode: boolean, form: UserFormState) {
	return {
		dialogTitle: isEditMode ? 'Gebruiker bewerken' : 'Nieuwe gebruiker toevoegen',
		dialogDescription: isEditMode
			? `Wijzig de gegevens van ${form.first_name || form.email}.`
			: 'Voeg een nieuwe gebruiker toe aan het systeem.',
		submitLabel: isEditMode ? 'Opslaan' : 'Toevoegen',
		savingLabel: isEditMode ? 'Opslaan...' : 'Toevoegen...',
	};
}

export function parseUserRoleSelectValue(value: string): AppRole | null {
	return value === 'none' ? null : (value as AppRole);
}

export function isUserRoleLocked(
	isEditMode: boolean,
	isAdmin: boolean,
	isSiteAdmin: boolean,
	userRole: AppRole | null | undefined,
): boolean {
	return isEditMode && isAdmin && !isSiteAdmin && userRole === 'site_admin';
}

export function hasUserFormChanges(initial: UserFormState, current: UserFormState): boolean {
	const trimmedInitial = trimUserFormState(initial);
	const trimmedCurrent = trimUserFormState(current);
	return (
		trimmedInitial.email !== trimmedCurrent.email ||
		trimmedInitial.first_name !== trimmedCurrent.first_name ||
		trimmedInitial.last_name !== trimmedCurrent.last_name ||
		trimmedInitial.phone_number !== trimmedCurrent.phone_number ||
		trimmedInitial.role !== trimmedCurrent.role
	);
}

export function resolveUserFormSubmitDisabled(
	isEditMode: boolean,
	form: UserFormState,
	initialForm: UserFormState,
): boolean {
	if (!trimUserFormState(form).email) return true;
	if (isEditMode && !hasUserFormChanges(initialForm, form)) return true;
	return false;
}
