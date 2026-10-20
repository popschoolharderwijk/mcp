/** Display helpers for lesson fees (Dutch formatting). Amounts come from the database fee rules. */

export type LessonFeeAgeCategory = 'under_21' | '21_plus';

export interface LessonFee {
	amount_cents: number;
	age_category: LessonFeeAgeCategory | null;
	btw_rate: number;
	amount_excl_btw_cents: number;
	btw_amount_cents: number;
	is_prorated: boolean;
	tariff_effective_from: string | null;
}

export function formatCentsNl(cents: number): string {
	return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

/** YYYY-MM-DD → "1 september 2026". */
export function formatDateNl(date: string): string {
	return new Date(`${date}T12:00:00`).toLocaleDateString('nl-NL', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	});
}

/** "€ 88,79 incl. € 15,41 btw" or "€ 73,38 (vrijgesteld van btw)". */
export function formatLessonFeeAmount(fee: Pick<LessonFee, 'amount_cents' | 'btw_rate' | 'btw_amount_cents'>): string {
	if (fee.btw_rate === 21) {
		return `${formatCentsNl(fee.amount_cents)} incl. ${formatCentsNl(fee.btw_amount_cents)} btw`;
	}
	return `${formatCentsNl(fee.amount_cents)} (vrijgesteld van btw)`;
}

export function formatAgeCategoryLabel(category: LessonFeeAgeCategory | null): string {
	if (category === '21_plus') return '21+';
	if (category === 'under_21') return 'onder 21';
	return '—';
}

/** First day of the month of a YYYY-MM-DD date. */
export function monthStart(date: string): string {
	return `${date.slice(0, 7)}-01`;
}

/** First day of the next billable month (skips August). */
export function nextBillableMonth(date: string): string {
	const [y, m] = date.split('-').map(Number);
	let year = y;
	let month = m + 1;
	if (month > 12) {
		month = 1;
		year += 1;
	}
	if (month === 8) month = 9;
	return `${year}-${String(month).padStart(2, '0')}-01`;
}
