import type { ChangeEvent } from 'react';
import { toast } from 'sonner';
import { dispatchProfileUpdated, persistAvatarDelete, persistAvatarUpload } from '@/lib/account/persistence';

export type ProfileAvatarUploadResult = { ok: true; avatarUrl: string | null } | { ok: false };

export function takeAvatarFileFromInput(event: ChangeEvent<HTMLInputElement>): File | null {
	const file = event.target.files?.[0] ?? null;
	event.target.value = '';
	return file;
}

export async function uploadProfileAvatar(userId: string, file: File): Promise<ProfileAvatarUploadResult> {
	const { error, avatarUrl } = await persistAvatarUpload(userId, file);
	if (error) {
		toast.error('Fout bij uploaden avatar', { description: error });
		return { ok: false };
	}
	toast.success('Avatar opgeslagen!');
	dispatchProfileUpdated();
	return { ok: true, avatarUrl };
}

export async function deleteProfileAvatar(userId: string): Promise<boolean> {
	const { error } = await persistAvatarDelete(userId);
	if (error) {
		toast.error('Fout bij verwijderen avatar', { description: error });
		return false;
	}
	toast.success('Avatar verwijderd!');
	dispatchProfileUpdated();
	return true;
}
