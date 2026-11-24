const AVATAR_EXTENSION_BY_MIME = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/gif': 'gif',
	'image/webp': 'webp',
} as const;

const AVATAR_MIME_BY_EXTENSION = {
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	gif: 'image/gif',
	webp: 'image/webp',
} as const;

export const AVATAR_UPLOAD_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp';

export type AvatarUploadContentType = keyof typeof AVATAR_EXTENSION_BY_MIME;

/** Resolve a storage-allowed content type from the file type or extension. */
export function resolveAvatarUploadContentType(file: Pick<File, 'type' | 'name'>): AvatarUploadContentType | null {
	if (file.type === 'image/jpg') return 'image/jpeg';
	if (file.type in AVATAR_EXTENSION_BY_MIME) {
		return file.type as AvatarUploadContentType;
	}
	const extension = file.name.split('.').pop()?.toLowerCase();
	if (!extension || !(extension in AVATAR_MIME_BY_EXTENSION)) return null;
	return AVATAR_MIME_BY_EXTENSION[extension as keyof typeof AVATAR_MIME_BY_EXTENSION];
}

export function resolveAvatarUploadExtension(contentType: AvatarUploadContentType): string {
	return AVATAR_EXTENSION_BY_MIME[contentType];
}
