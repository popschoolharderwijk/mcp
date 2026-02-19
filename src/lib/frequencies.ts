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
