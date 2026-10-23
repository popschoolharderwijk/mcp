import type { AnnouncementAudience } from '@/hooks/useAnnouncements';

export interface AnnouncementFormAudienceFlags {
	audienceTeachers: boolean;
	audienceStudents: boolean;
}

export function audienceLabel(audience: AnnouncementAudience[]): string {
	const parts: string[] = [];
	if (audience.includes('teachers')) parts.push('Docenten');
	if (audience.includes('students')) parts.push('Leerlingen');
	return parts.join(' + ') || '—';
}

export function audienceFromFormFlags(flags: AnnouncementFormAudienceFlags): AnnouncementAudience[] {
	return [
		...(flags.audienceTeachers ? (['teachers'] as const) : []),
		...(flags.audienceStudents ? (['students'] as const) : []),
	];
}

export interface AnnouncementFormSaveInput {
	title: string;
	body: string;
	audience: AnnouncementAudience[];
	publish: boolean;
	existingPublishedAt?: string | null;
}

export function buildAnnouncementSavePayload(input: AnnouncementFormSaveInput) {
	return {
		title: input.title.trim(),
		body: input.body,
		audience: input.audience,
		published_at: input.publish ? (input.existingPublishedAt ?? new Date().toISOString()) : null,
	};
}

export function isAnnouncementFormValid(title: string, audience: AnnouncementAudience[]): boolean {
	return title.trim().length > 0 && audience.length > 0;
}

export function isAnnouncementImageFile(file: File): boolean {
	return file.type.startsWith('image/');
}

export function buildAnnouncementImagePath(fileName: string): string {
	const extension = fileName.split('.').pop()?.toLowerCase() ?? 'png';
	return `${crypto.randomUUID()}.${extension}`;
}
