/**
 * Normalize an IBAN input (strip spaces, uppercase).
 */
export function normalizeIban(input: string): string {
	return input.replace(/\s+/g, '').toUpperCase();
}

/**
 * Mod-97 validation for an IBAN. Returns `true` only when both the structure
 * (2 letters + 2 digits + 11–30 alphanumeric) and the checksum are valid.
 */
export function isValidIban(input: string): boolean {
	const iban = normalizeIban(input);
	if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
	const rearranged = iban.slice(4) + iban.slice(0, 4);
	const numeric = rearranged
		.split('')
		.map((c) => (c >= 'A' && c <= 'Z' ? (c.charCodeAt(0) - 55).toString() : c))
		.join('');
	let remainder = 0;
	for (let i = 0; i < numeric.length; i += 7) {
		const chunk = remainder.toString() + numeric.slice(i, i + 7);
		remainder = Number(chunk) % 97;
	}
	return remainder === 1;
}

/**
 * Format an IBAN for display with a space every 4 characters.
 */
export function formatIban(input: string): string {
	const iban = normalizeIban(input);
	return iban.replace(/(.{4})/g, '$1 ').trim();
}
