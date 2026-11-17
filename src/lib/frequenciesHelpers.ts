/** Dutch display labels for `lesson_frequency` enum values (UI + edge mail/Stripe). */

export const FREQUENCY_LABELS = {
	daily: 'Dagelijks',
	weekly: 'Wekelijks',
	biweekly: 'Tweewekelijks',
	monthly: 'Maandelijks',
} as const;

export type FrequencyLabelKey = keyof typeof FREQUENCY_LABELS;

export function getFrequencyLabel(frequency: string | null | undefined): string {
	if (frequency == null || frequency === '') return '';
	return FREQUENCY_LABELS[frequency as FrequencyLabelKey] ?? frequency;
}
