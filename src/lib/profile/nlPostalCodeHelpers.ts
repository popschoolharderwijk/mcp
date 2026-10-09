/**
 * Dutch postcode: 4 digits, optional spaces (stripped), optional 2 letters (uppercased).
 * Examples: 1234, 1234AB, 1234 AB, 1234ab.
 */

/** Remove whitespace and uppercase letters. Does not validate shape. */
export function normalizeNlPostalCode(value: string): string {
	return value.replace(/\s+/g, '').toUpperCase();
}

export function normalizeNlPostalCodeOrNull(value: string | null | undefined): string | null {
	if (value == null) return null;
	const normalized = normalizeNlPostalCode(value);
	return normalized || null;
}

/** Blank is allowed (optional field). Non-empty must be dddd or ddddLL after normalize. */
export function isValidNlPostalCode(value: string): boolean {
	const normalized = normalizeNlPostalCode(value);
	if (!normalized) return true;
	return /^\d{4}([A-Z]{2})?$/.test(normalized);
}
