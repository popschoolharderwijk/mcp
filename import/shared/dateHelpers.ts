const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse a date string to `YYYY-MM-DD`, or null if invalid / empty. */
export function normalizeIsoDate(input: string | null | undefined): string | null {
	if (input == null) return null;
	const trimmed = input.trim();
	if (!trimmed) return null;

	const match = ISO_DATE_RE.exec(trimmed);
	if (!match) return null;

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(Date.UTC(year, month - 1, day));
	if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
		return null;
	}

	return `${match[1]}-${match[2]}-${match[3]}`;
}
