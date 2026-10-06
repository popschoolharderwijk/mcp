import { supabase } from '@/integrations/supabase/client';
import { removeUserAvatarFiles } from '@/lib/storage/avatars';
import { normalizeCompactTextOrNull, normalizeTrimmedTextOrNull } from '@/lib/text/normalizeText';

export type AccountFormData = {
	first_name: string;
	last_name: string;
	phone_number: string;
};

export type AccountFormErrors = {
	first_name?: string;
	last_name?: string;
	phone_number?: string;
};

export type AccountProfileState = {
	first_name: string | null;
	last_name: string | null;
	phone_number: string | null;
	avatar_url: string | null;
};

export function dispatchProfileUpdated(): void {
	window.dispatchEvent(new Event('profile-updated'));
}

export function normalizeAccountFormData(formData: AccountFormData): AccountFormData {
	return {
		first_name: normalizeCompactTextOrNull(formData.first_name) ?? '',
		last_name: normalizeCompactTextOrNull(formData.last_name) ?? '',
		phone_number: normalizeTrimmedTextOrNull(formData.phone_number) ?? '',
	};
}

export async function persistProfile(userId: string, formData: AccountFormData): Promise<{ error: string | null }> {
	const normalized = normalizeAccountFormData(formData);
	const { error } = await supabase
		.from('profiles')
		.update({
			first_name: normalized.first_name || null,
			last_name: normalized.last_name || null,
			phone_number: normalized.phone_number || null,
		})
		.eq('user_id', userId);
	return { error: error?.message ?? null };
}

export async function persistAvatarUpload(
	userId: string,
	file: File,
): Promise<{ error: string | null; avatarUrl: string | null }> {
	const fileExt = file.name.split('.').pop();
	const filePath = `${userId}.${fileExt}`;
	await removeUserAvatarFiles(userId);
	const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
	if (uploadError) return { error: uploadError.message, avatarUrl: null };
	const {
		data: { publicUrl },
	} = supabase.storage.from('avatars').getPublicUrl(filePath);
	const avatarUrl = `${publicUrl}?t=${Date.now()}`;
	const { error: updateError } = await supabase
		.from('profiles')
		.update({ avatar_url: avatarUrl })
		.eq('user_id', userId);
	return { error: updateError?.message ?? null, avatarUrl: updateError ? null : avatarUrl };
}

export async function persistAvatarDelete(userId: string): Promise<{ error: string | null }> {
	const { error: deleteError } = await removeUserAvatarFiles(userId);
	if (deleteError) return { error: deleteError.message };
	const { error: updateError } = await supabase.from('profiles').update({ avatar_url: null }).eq('user_id', userId);
	return { error: updateError?.message ?? null };
}

export async function persistAccountDelete(): Promise<{ error: string | null; code?: string }> {
	const {
		data: { session },
	} = await supabase.auth.getSession();
	if (!session) return { error: 'Sessie verlopen' };
	const { data, error: invokeError } = await supabase.functions.invoke('delete-user', { method: 'POST' });
	if (invokeError) {
		return { error: invokeError.message || 'Er is een onbekende fout opgetreden.', code: data?.code };
	}
	return { error: null };
}

export function validateProfilePhone(phoneNumber: string): AccountFormErrors {
	if (phoneNumber && phoneNumber.length !== 10) {
		return { phone_number: 'Telefoonnummer moet precies 10 cijfers zijn' };
	}
	return {};
}
