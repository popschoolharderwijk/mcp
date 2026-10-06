/** Collapse whitespace runs, then trim ends (matches SQL normalize_compact_text). */
export function normalizeCompactText(value: string): string {
	return value.replace(/\s+/g, ' ').trim();
}

export function normalizeCompactTextOrNull(value: string | null | undefined): string | null {
	if (value == null) return null;
	return normalizeCompactText(value) || null;
}

/** Trim ends only (emails, phones, multiline bio). */
export function normalizeTrimmedText(value: string): string {
	return value.trim();
}

export function normalizeTrimmedTextOrNull(value: string | null | undefined): string | null {
	if (value == null) return null;
	return normalizeTrimmedText(value) || null;
}
