const DUTCH_MOBILE_RE = /^06[0-9]{8}$/;

/**
 * Normalize a phone string to the DB format `06XXXXXXXX`.
 * Accepts NL national, +31…, 0031…, and common separators. Invalid → null.
 */
export function normalizeDutchMobilePhone(input: string | null | undefined): string | null {
	if (input == null) return null;
	const trimmed = input.trim();
	if (!trimmed) return null;

	let working = trimmed.replace(/[\s\-().]/g, '');

	if (working.startsWith('00')) {
		working = `+${working.slice(2)}`;
	}

	if (working.startsWith('+')) {
		const digits = working.slice(1).replace(/\D/g, '');
		if (digits.startsWith('31')) {
			working = `0${digits.slice(2)}`;
		} else {
			return null;
		}
	} else {
		working = working.replace(/\D/g, '');
		if (working.startsWith('31') && working.length === 11) {
			working = `0${working.slice(2)}`;
		}
	}

	return DUTCH_MOBILE_RE.test(working) ? working : null;
}
