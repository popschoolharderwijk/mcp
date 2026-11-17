import { FREQUENCY_LABELS, getFrequencyLabel } from '@/lib/frequenciesHelpers';
import type { LessonFrequency } from '@/types/lesson-agreements';

export { getFrequencyLabel };

export const frequencyLabels: Record<LessonFrequency, string> = { ...FREQUENCY_LABELS };

export const frequencyOptions = Object.entries(frequencyLabels).map(([value, label]) => ({
	value: value as LessonFrequency,
	label,
}));

export function formatLessonOptionSummary(option: {
	duration_minutes: number;
	frequency: LessonFrequency;
	price_per_lesson: number;
}): string {
	return `${option.duration_minutes} min · ${getFrequencyLabel(option.frequency)} · €${option.price_per_lesson}`;
}
