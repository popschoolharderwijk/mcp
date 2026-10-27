/** Invert canonical → sources into source → canonical; reject duplicate source names. */
export function invertLessonTypeAliases(
	aliases: Record<string, readonly string[]>,
): { ok: true; sourceToCanonical: Map<string, string> } | { ok: false; error: string } {
	const sourceToCanonical = new Map<string, string>();
	for (const [canonical, sources] of Object.entries(aliases)) {
		for (const source of sources) {
			const existing = sourceToCanonical.get(source);
			if (existing != null) {
				return {
					ok: false,
					error: `settings.json lessonTypeAliases: source name ${JSON.stringify(source)} listed under both ${JSON.stringify(existing)} and ${JSON.stringify(canonical)}`,
				};
			}
			sourceToCanonical.set(source, canonical);
		}
	}
	return { ok: true, sourceToCanonical };
}

function parseCanonicalSourceList(
	canonical: string,
	sourcesRaw: unknown,
): { ok: true; sources: string[] } | { ok: false; error: string } {
	if (canonical.trim() === '') {
		return { ok: false, error: 'settings.json lessonTypeAliases: canonical name must be non-empty' };
	}
	if (!Array.isArray(sourcesRaw) || sourcesRaw.length === 0) {
		return {
			ok: false,
			error: `settings.json lessonTypeAliases[${JSON.stringify(canonical)}] must be a non-empty array of strings`,
		};
	}
	const sources: string[] = [];
	for (const source of sourcesRaw) {
		if (typeof source !== 'string' || source.trim() === '') {
			return {
				ok: false,
				error: `settings.json lessonTypeAliases[${JSON.stringify(canonical)}] entries must be non-empty strings`,
			};
		}
		sources.push(source);
	}
	return { ok: true, sources };
}

/**
 * Validate raw `lessonTypeAliases` object (canonical → non-empty source name arrays).
 * Returns the record plus an invert map, or an error on bad shape / duplicate sources.
 */
export function parseLessonTypeAliases(
	raw: unknown,
):
	| { ok: true; value: Record<string, string[]>; sourceToCanonical: Map<string, string> }
	| { ok: false; error: string } {
	if (raw === undefined) {
		return { ok: true, value: {}, sourceToCanonical: new Map() };
	}
	if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
		return { ok: false, error: 'settings.json lessonTypeAliases must be an object' };
	}

	const value: Record<string, string[]> = {};
	for (const [canonical, sourcesRaw] of Object.entries(raw as Record<string, unknown>)) {
		const parsed = parseCanonicalSourceList(canonical, sourcesRaw);
		if (!parsed.ok) return parsed;
		value[canonical] = parsed.sources;
	}

	const inverted = invertLessonTypeAliases(value);
	if (!inverted.ok) return inverted;
	return { ok: true, value, sourceToCanonical: inverted.sourceToCanonical };
}
