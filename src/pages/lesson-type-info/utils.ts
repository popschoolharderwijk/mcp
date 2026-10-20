import type { OptionModalFormState } from '@/pages/lesson-type-info/types';
import type { LessonFrequency, LessonTypeOptionFormRow } from '@/types/lesson-agreements';

export const centsToInput = (cents: number | null | undefined): string =>
	cents == null ? '' : (cents / 100).toFixed(2);

/** Euro input to cents; empty or non-positive input becomes null. */
export function inputToCentsOrNull(input: string): number | null {
	const n = parseFloat(input.replace(',', '.'));
	if (Number.isNaN(n) || n <= 0) return null;
	return Math.round(n * 100);
}

export function optionSort(a: LessonTypeOptionFormRow, b: LessonTypeOptionFormRow): number {
	const durA = parseInt(a.duration_minutes, 10) || 0;
	const durB = parseInt(b.duration_minutes, 10) || 0;
	if (durA !== durB) return durA - durB;
	const order: LessonFrequency[] = ['weekly', 'biweekly', 'monthly', 'daily'];
	const byFrequency = order.indexOf(a.frequency) - order.indexOf(b.frequency);
	if (byFrequency !== 0) return byFrequency;
	return a.label.localeCompare(b.label);
}

/** Columns written to lesson_type_options. */
export function buildOptionDbPayloadFromForm(form: OptionModalFormState) {
	return {
		duration_minutes: parseInt(form.duration_minutes, 10),
		frequency: form.frequency,
		label: form.label.trim() || null,
		billing_kind: form.billing_kind,
		has_adult_tariff: form.has_adult_tariff,
	};
}

/** Row written to lesson_type_option_tariffs (one per effective date). */
export function buildTariffPayloadFromForm(form: OptionModalFormState) {
	return {
		effective_from: form.effective_from,
		amount_under_21_cents: inputToCentsOrNull(form.amount_under_21),
		amount_adult_cents: form.has_adult_tariff ? inputToCentsOrNull(form.amount_adult) : null,
	};
}

export function formatOptionPrice(value: string): string {
	const n = parseFloat(value);
	return Number.isNaN(n)
		? '—'
		: `€ ${n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
