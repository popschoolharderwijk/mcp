import type { LessonFrequency } from '@/types/lesson-agreements';

export const frequencyLabels: Record<LessonFrequency, string> = {
	daily: 'Dagelijks',
	weekly: 'Wekelijks',
	biweekly: 'Tweewekelijks',
	monthly: 'Maandelijks',
};

export const frequencyOptions = Object.entries(frequencyLabels).map(([value, label]) => ({
	value: value as LessonFrequency,
	label,
}));

export function formatLessonOptionSummary(option: {
	duration_minutes: number;
	frequency: LessonFrequency;
	price_per_lesson: number;
}): string {
	return `${option.duration_minutes} min · ${frequencyLabels[option.frequency]} · €${option.price_per_lesson}`;
}
