import { DAY_NAMES } from '@/lib/date/day-index';
import { frequencyLabels } from '@/lib/frequencies';
import { formatTime } from '@/lib/time/time-format';
import type { LessonFrequency } from '@/types/lesson-agreements';

export interface LessonGroupConfirmSlot {
	day_of_week: number;
	start_time: string;
}

export interface LessonGroupConfirmTeacher {
	firstName: string | null;
	lastName: string | null;
	email: string | null;
	avatarUrl: string | null;
}

export interface LessonGroupConfirmTeacherProfile {
	first_name: string | null;
	last_name: string | null;
	email: string | null;
	avatar_url: string | null;
}

export function formatLessonGroupScheduleText(
	slot: LessonGroupConfirmSlot | null,
	durationMinutes: number,
	frequency: LessonFrequency,
): string {
	if (!slot) return '-';
	return `${DAY_NAMES[slot.day_of_week]} ${formatTime(slot.start_time)} · ${durationMinutes} min · ${frequencyLabels[frequency]}`;
}

export function formatLessonGroupPeriodText(
	startDate: string,
	endDate: string | null,
	formatDate: (value: string) => string,
): string {
	const endLabel = endDate ? formatDate(endDate) : 'Geen einde';
	return `${formatDate(startDate)} t/m ${endLabel}`;
}

export type LessonGroupMembersDisplayKind = 'empty' | 'single' | 'multiple';

export function resolveLessonGroupMembersDisplay(memberCount: number): {
	kind: LessonGroupMembersDisplayKind;
	label: string;
} {
	if (memberCount === 0) {
		return { kind: 'empty', label: 'Nog geen leerlingen' };
	}
	if (memberCount === 1) {
		return { kind: 'single', label: '1 deelnemer' };
	}
	return { kind: 'multiple', label: `${memberCount} deelnemers` };
}

export function resolveLessonGroupTeacherProfile(
	teacher: LessonGroupConfirmTeacher | undefined,
): LessonGroupConfirmTeacherProfile | null {
	if (!teacher) return null;
	return {
		first_name: teacher.firstName,
		last_name: teacher.lastName,
		email: teacher.email,
		avatar_url: teacher.avatarUrl,
	};
}

export function resolveLessonGroupNameDisplay(name: string): string {
	const trimmed = name.trim();
	return trimmed.length > 0 ? trimmed : '-';
}
