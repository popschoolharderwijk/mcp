/** Dutch display labels for `lesson_frequency` enum values (UI + edge mail/Stripe). */

export const FREQUENCY_LABELS = {
	daily: 'Dagelijks',
	weekly: 'Wekelijks',
	biweekly: 'Tweewekelijks',
	monthly: 'Maandelijks',
} as const;

export type FrequencyKey = keyof typeof FREQUENCY_LABELS;

export function getFrequencyLabel(frequency: FrequencyKey): string {
	return FREQUENCY_LABELS[frequency];
}
