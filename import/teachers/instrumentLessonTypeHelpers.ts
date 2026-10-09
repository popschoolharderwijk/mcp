/** Bootstrap lesson type names from supabase/seeds/bootstrap.sql */
const BOOTSTRAP_LESSON_TYPE_NAMES = [
	'Gitaarles',
	'Drumles',
	'Zangles',
	'Basles',
	'Keyboardles',
	'Saxofoonles',
	'DJ / Beats',
	'Bandcoaching',
] as const;

export type BootstrapLessonTypeName = (typeof BOOTSTRAP_LESSON_TYPE_NAMES)[number];

/** Normalized alias → bootstrap lesson type name. */
const INSTRUMENT_ALIASES: Record<string, BootstrapLessonTypeName> = {
	zang: 'Zangles',
	zangles: 'Zangles',
	vocal: 'Zangles',
	vocals: 'Zangles',
	gitaar: 'Gitaarles',
	gitaarles: 'Gitaarles',
	guitar: 'Gitaarles',
	drum: 'Drumles',
	drums: 'Drumles',
	drumles: 'Drumles',
	bas: 'Basles',
	bass: 'Basles',
	basles: 'Basles',
	toetsen: 'Keyboardles',
	keyboard: 'Keyboardles',
	keyboardles: 'Keyboardles',
	piano: 'Keyboardles',
	saxofoon: 'Saxofoonles',
	sax: 'Saxofoonles',
	saxofoonles: 'Saxofoonles',
	dj: 'DJ / Beats',
	beats: 'DJ / Beats',
	'dj/beats': 'DJ / Beats',
	'dj / beats': 'DJ / Beats',
	band: 'Bandcoaching',
	bandcoaching: 'Bandcoaching',
};

export type InstrumentLessonTypeMatch = {
	lessonTypeNames: BootstrapLessonTypeName[];
	unmatchedTokens: string[];
};

function normalizeInstrumentToken(token: string): string {
	return token
		.toLowerCase()
		.replace(/\([^)]*\)/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function splitInstrumentField(instrument: string): string[] {
	return instrument
		.split(/[/|,;]+/)
		.map((part) => normalizeInstrumentToken(part))
		.filter((part) => part.length > 0);
}

function resolveAlias(token: string): BootstrapLessonTypeName | null {
	const direct = INSTRUMENT_ALIASES[token];
	if (direct) return direct;

	const compact = token.replace(/\s+/g, '');
	const compactHit = INSTRUMENT_ALIASES[compact];
	if (compactHit) return compactHit;

	return null;
}

/**
 * Map a Mongo `instrument` string to bootstrap lesson type names.
 * Unmatched tokens are returned for warnings; they do not fail the row.
 */
export function mapInstrumentToLessonTypes(instrument: string | null | undefined): InstrumentLessonTypeMatch {
	if (instrument == null) {
		return { lessonTypeNames: [], unmatchedTokens: [] };
	}
	const trimmed = instrument.trim();
	if (!trimmed) {
		return { lessonTypeNames: [], unmatchedTokens: [] };
	}

	const whole = normalizeInstrumentToken(trimmed);
	const wholeMatch = resolveAlias(whole);
	if (wholeMatch) {
		return { lessonTypeNames: [wholeMatch], unmatchedTokens: [] };
	}

	const tokens = splitInstrumentField(trimmed);
	const matched = new Set<BootstrapLessonTypeName>();
	const unmatched: string[] = [];

	for (const token of tokens) {
		const lessonType = resolveAlias(token);
		if (lessonType) {
			matched.add(lessonType);
		} else {
			unmatched.push(token);
		}
	}

	if (matched.size === 0 && unmatched.length === 0) {
		unmatched.push(whole);
	} else if (matched.size === 0 && tokens.length === 0) {
		unmatched.push(whole);
	}

	return {
		lessonTypeNames: [...matched],
		unmatchedTokens: unmatched,
	};
}
