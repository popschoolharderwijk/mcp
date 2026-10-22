/** Bootstrap default — keep in sync with app_settings.vat.age_threshold_years. */
export const DEFAULT_VAT_AGE_THRESHOLD_YEARS = 21;

/** Bootstrap default — keep in sync with app_settings.vat.standard_rate_percent. */
export const DEFAULT_VAT_STANDARD_RATE_PERCENT = 21;

export function formatVatPercentLabel(standardRatePercent: number): string {
	return `BTW ${standardRatePercent}%`;
}

export function ageAtDate(
	dob: string | null,
	date: string,
	ageThresholdYears: number = DEFAULT_VAT_AGE_THRESHOLD_YEARS,
): 'youth' | 'adult' | 'unknown' {
	if (!dob) return 'unknown';
	const d = new Date(date);
	const b = new Date(dob);
	let age = d.getFullYear() - b.getFullYear();
	const m = d.getMonth() - b.getMonth();
	if (m < 0 || (m === 0 && d.getDate() < b.getDate())) age--;
	return age >= ageThresholdYears ? 'adult' : 'youth';
}

export function fmtEUR(cents: number): string {
	return (cents / 100).toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' });
}

export function fmtDateNL(iso: string): string {
	const d = new Date(iso);
	return d.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function wrap(text: string, max: number): string[] {
	const words = text.split(' ');
	const out: string[] = [];
	let cur = '';
	for (const w of words) {
		if ((cur + ' ' + w).trim().length > max) {
			if (cur) out.push(cur);
			cur = w;
		} else {
			cur = (cur + ' ' + w).trim();
		}
	}
	if (cur) out.push(cur);
	return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
	let bin = '';
	for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
	return btoa(bin);
}
