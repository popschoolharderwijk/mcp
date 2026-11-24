import { supabase } from '@/integrations/supabase/client';
import {
	resolveAvatarUploadContentType,
	resolveAvatarUploadExtension,
} from '@/lib/account/accountProfileAvatarHelpers';
import { removeUserAvatarFiles } from '@/lib/storage/avatars';

export type AccountProfileState = {
	avatar_url: string | null;
};

export function dispatchProfileUpdated(): void {
	window.dispatchEvent(new Event('profile-updated'));
}

async function storeAvatarPublicUrl(
	userId: string,
	filePath: string,
): Promise<{ error: string | null; avatarUrl: string | null }> {
	const {
		data: { publicUrl },
	} = supabase.storage.from('avatars').getPublicUrl(filePath);
	const avatarUrl = `${publicUrl}?t=${Date.now()}`;
	const { error } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('user_id', userId);
	if (error) return { error: error.message, avatarUrl: null };
	return { error: null, avatarUrl };
}

export async function persistAvatarUpload(
	userId: string,
	file: File,
): Promise<{ error: string | null; avatarUrl: string | null }> {
	const contentType = resolveAvatarUploadContentType(file);
	if (!contentType) {
		return { error: 'Alleen JPG, PNG, GIF of WebP tot 5MB.', avatarUrl: null };
	}
	const filePath = `${userId}.${resolveAvatarUploadExtension(contentType)}`;
	await removeUserAvatarFiles(userId);
	const { error: uploadError } = await supabase.storage
		.from('avatars')
		.upload(filePath, file, { upsert: true, contentType });
	if (uploadError) return { error: uploadError.message, avatarUrl: null };
	return storeAvatarPublicUrl(userId, filePath);
}

export async function persistAvatarDelete(userId: string): Promise<{ error: string | null }> {
	const { error: deleteError } = await removeUserAvatarFiles(userId);
	if (deleteError) return { error: deleteError.message };
	const { error: updateError } = await supabase.from('profiles').update({ avatar_url: null }).eq('user_id', userId);
	return { error: updateError?.message ?? null };
}

async function invokeDeleteUserAccount(): Promise<{ error: string | null; code?: string }> {
	const { data, error: invokeError } = await supabase.functions.invoke('delete-user', { method: 'POST' });
	if (invokeError) {
		return { error: invokeError.message || 'Er is een onbekende fout opgetreden.', code: data?.code };
	}
	return { error: null };
}

export async function persistAccountDelete(): Promise<{ error: string | null; code?: string }> {
	const {
		data: { session },
	} = await supabase.auth.getSession();
	if (!session) return { error: 'Sessie verlopen' };
	return invokeDeleteUserAccount();
}
