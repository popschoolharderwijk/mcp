import type { LessonAgreementWithTeacher } from '@/types/lesson-agreements';

export type AgreementStatusVariant = 'default' | 'secondary';

/** Key for the fee preview of a stored agreement; null hides the block (non-privileged or missing ids). */
export function resolveAgreementFeePreviewKey(
	agreement: LessonAgreementWithTeacher | null,
	studentUserId: string | undefined,
	lessonTypeId: string | undefined,
	isPrivileged: boolean,
): string | null {
	if (!agreement || !studentUserId || !lessonTypeId || !isPrivileged) return null;
	return `${agreement.id}:${agreement.start_date}:${agreement.end_date ?? ''}`;
}

export function resolveAgreementStatusVariant(isActive: boolean): AgreementStatusVariant {
	return isActive ? 'default' : 'secondary';
}

export function resolveAgreementStatusLabel(isActive: boolean): string {
	return isActive ? 'Actief' : 'Inactief';
}

export function resolveAgreementDayLabel(dayOfWeek: number, dayNames: readonly string[]): string {
	return dayNames[dayOfWeek] ?? `Dag ${dayOfWeek}`;
}

export function resolveAgreementEndDateLabel(endDate: string | null): string {
	return endDate ? formatAgreementDate(endDate) : 'Geen einddatum';
}

export function formatAgreementDate(date: string): string {
	return new Date(date).toLocaleDateString('nl-NL', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
}
