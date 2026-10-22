import type { LessonFrequency, LessonTypeOptionFormRow } from '@/types/lesson-agreements';

export const centsToInput = (cents: number | null | undefined): string =>
	cents == null ? '' : (cents / 100).toFixed(2);

const inputToCents = (input: string): number => Math.round((parseFloat(input) || 0) * 100);

export function optionSort(a: LessonTypeOptionFormRow, b: LessonTypeOptionFormRow): number {
	const durA = parseInt(a.duration_minutes, 10) || 0;
	const durB = parseInt(b.duration_minutes, 10) || 0;
	if (durA !== durB) return durA - durB;
	const order: LessonFrequency[] = ['weekly', 'biweekly', 'monthly', 'daily'];
	return order.indexOf(a.frequency) - order.indexOf(b.frequency);
}

export function buildOptionDbPayloadFromForm(
	durationMinutes: string,
	frequency: LessonFrequency,
	priceYouthInput: string,
	priceAdultInput: string,
	priceAdult: number,
) {
	return {
		duration_minutes: parseInt(durationMinutes, 10),
		frequency,
		price_per_lesson: priceAdult,
		price_per_lesson_youth_cents: inputToCents(priceYouthInput),
		price_per_lesson_adult_cents: inputToCents(priceAdultInput),
	};
}

export function formatOptionPrice(value: string): string {
	const n = parseFloat(value);
	return Number.isNaN(n)
		? '—'
		: `€ ${n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
