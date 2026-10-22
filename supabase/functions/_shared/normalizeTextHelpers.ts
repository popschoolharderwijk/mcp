// Edge helpers for person/contact text. Behavior mirrors src/lib/text/normalizeText.ts
// (different export names on purpose — Fallow duplicate-export gate).

export function compactOrNull(value: string | null | undefined): string | null {
	if (value == null) return null;
	const next = value.replace(/\s+/g, ' ').trim();
	return next.length > 0 ? next : null;
}

export function trimOrNull(value: string | null | undefined): string | null {
	if (value == null) return null;
	const next = value.trim();
	return next.length > 0 ? next : null;
}
