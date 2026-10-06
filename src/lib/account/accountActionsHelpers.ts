import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';
import type { AccountFormData, AccountFormErrors, AccountProfileState } from '@/lib/account/persistence';
import {
	dispatchProfileUpdated,
	normalizeAccountFormData,
	persistAvatarUpload,
	persistProfile,
	validateProfilePhone,
} from '@/lib/account/persistence';

function hasProfileValidationErrors(errors: AccountFormErrors): boolean {
	return Object.keys(errors).length > 0;
}

function mergeProfileFromForm(profile: AccountProfileState, formData: AccountFormData): AccountProfileState {
	const normalized = normalizeAccountFormData(formData);
	return {
		...profile,
		first_name: normalized.first_name || null,
		last_name: normalized.last_name || null,
		phone_number: normalized.phone_number || null,
	};
}

function mergeAvatarIntoProfile(profile: AccountProfileState, avatarUrl: string): AccountProfileState {
	return { ...profile, avatar_url: avatarUrl };
}

function shouldAbortAvatarUpload(
	files: FileList | null | undefined,
): files is null | undefined | (FileList & { length: 0 }) {
	return !files || files.length === 0;
}

type AvatarUploadOutcome = 'skipped' | 'error' | 'success';

function resolveAvatarUploadOutcome(
	error: string | null | undefined,
	profile: AccountProfileState | null,
	avatarUrl: string | null | undefined,
): AvatarUploadOutcome {
	if (error) {
		return 'error';
	}
	if (profile && avatarUrl) {
		return 'success';
	}
	return 'skipped';
}

function applyAvatarUploadOutcome(params: {
	outcome: AvatarUploadOutcome;
	error: string | null | undefined;
	profile: AccountProfileState | null;
	avatarUrl: string | null | undefined;
	setProfile: Dispatch<SetStateAction<AccountProfileState | null>>;
}): void {
	if (params.outcome === 'error') {
		toast.error('Fout bij uploaden avatar', { description: params.error ?? undefined });
		return;
	}
	if (params.outcome !== 'success' || !params.profile || !params.avatarUrl) {
		return;
	}
	params.setProfile(mergeAvatarIntoProfile(params.profile, params.avatarUrl));
	toast.success('Avatar opgeslagen!');
	dispatchProfileUpdated();
}

export type DeleteAccountToastKind = 'last-site-admin' | 'session-expired' | 'generic-error';

export function resolveDeleteAccountToastKind(error: string, code?: string): DeleteAccountToastKind {
	if (code === 'last_site_admin') return 'last-site-admin';
	if (error === 'Sessie verlopen') return 'session-expired';
	return 'generic-error';
}

export interface RunSaveProfileParams {
	userId: string;
	formData: AccountFormData;
	profile: AccountProfileState | null;
	setErrors: Dispatch<SetStateAction<AccountFormErrors>>;
	setSaving: Dispatch<SetStateAction<boolean>>;
	setProfile: Dispatch<SetStateAction<AccountProfileState | null>>;
}

export async function runSaveProfile(params: RunSaveProfileParams): Promise<void> {
	const newErrors = validateProfilePhone(params.formData.phone_number);
	params.setErrors(newErrors);
	if (hasProfileValidationErrors(newErrors)) return;

	params.setSaving(true);
	const { error } = await persistProfile(params.userId, params.formData);
	if (error) {
		toast.error('Fout bij opslaan', { description: error });
	} else if (params.profile) {
		params.setProfile(mergeProfileFromForm(params.profile, params.formData));
		toast.success('Profiel opgeslagen!');
		dispatchProfileUpdated();
	}
	params.setSaving(false);
}

export interface RunUploadAvatarParams {
	userId: string;
	event: ChangeEvent<HTMLInputElement>;
	profile: AccountProfileState | null;
	setSaving: Dispatch<SetStateAction<boolean>>;
	setProfile: Dispatch<SetStateAction<AccountProfileState | null>>;
}

export async function runUploadAvatar(params: RunUploadAvatarParams): Promise<void> {
	const files = params.event.target.files;
	if (shouldAbortAvatarUpload(files)) return;
	const file = files[0];

	params.setSaving(true);
	const { error, avatarUrl } = await persistAvatarUpload(params.userId, file);
	applyAvatarUploadOutcome({
		outcome: resolveAvatarUploadOutcome(error, params.profile, avatarUrl),
		error,
		profile: params.profile,
		avatarUrl,
		setProfile: params.setProfile,
	});
	params.setSaving(false);
}
