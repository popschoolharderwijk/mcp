/** "€ 51,56 per maand" for a duo student (amount from agreement_fee_months). */
export function formatMonthlyAmount(cents: number | null | undefined): string {
	if (cents == null || cents <= 0) return 'volgens de tarievenlijst';
	const euro = new Intl.NumberFormat('nl-NL', {
		style: 'currency',
		currency: 'EUR',
		minimumFractionDigits: 2,
	}).format(cents / 100);
	return `${euro} per maand`;
}

export function formatDate(iso: string): string {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
	return m ? `${m[3]}-${m[2]}-${m[1]}` : iso;
}
