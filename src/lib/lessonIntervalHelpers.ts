import type { LessonFrequency } from '@/types/lesson-agreements';

/** Advance a date by one occurrence interval (mutates). Matches app lesson scheduling rules. */
export function addInterval(date: Date, frequency: LessonFrequency): void {
	if (frequency === 'daily') {
		date.setDate(date.getDate() + 1);
		return;
	}
	if (frequency === 'weekly') {
		date.setDate(date.getDate() + 7);
		return;
	}
	if (frequency === 'biweekly') {
		date.setDate(date.getDate() + 14);
		return;
	}
	const dayOfMonth = date.getDate();
	date.setMonth(date.getMonth() + 1);
	const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
	date.setDate(Math.min(dayOfMonth, lastDay));
}
