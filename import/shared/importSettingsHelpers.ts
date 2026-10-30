import { normalizeIsoDate } from './dateHelpers';
import { parseLessonTypeAliases } from './lessonTypeAliasHelpers';

export type ImportSettings = {
	/** When set, only import agreements with `endDate` null or `>=` this `YYYY-MM-DD`. */
	minAgreementEndDate: string | null;
	/** When true, only import students who appear on at least one kept agreement. */
	removeOutdatedStudents: boolean;
	/** When true, collapse courses via `lessonTypeAliases` and require every course name to be listed. */
	useLessonTypeAliases: boolean;
	/** Canonical lesson type name → exact Mongo course `name`s that collapse onto it. */
	lessonTypeAliases: Record<string, string[]>;
};

export const DEFAULT_IMPORT_SETTINGS: ImportSettings = {
	minAgreementEndDate: null,
	removeOutdatedStudents: false,
	useLessonTypeAliases: false,
	lessonTypeAliases: {},
};

/** Validate raw JSON into import settings. */
export function parseImportSettings(raw: unknown): { ok: true; value: ImportSettings } | { ok: false; error: string } {
	if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
		return { ok: false, error: 'settings.json must be a JSON object' };
	}

	const record = raw as Record<string, unknown>;
	const minRaw = record.minAgreementEndDate;
	let minAgreementEndDate: string | null;
	if (minRaw === null || minRaw === undefined) {
		minAgreementEndDate = null;
	} else if (typeof minRaw === 'string') {
		const normalized = normalizeIsoDate(minRaw);
		if (normalized == null) {
			return {
				ok: false,
				error: `settings.json minAgreementEndDate must be null or YYYY-MM-DD (got ${JSON.stringify(minRaw)})`,
			};
		}
		minAgreementEndDate = normalized;
	} else {
		return {
			ok: false,
			error: `settings.json minAgreementEndDate must be null or YYYY-MM-DD (got ${JSON.stringify(minRaw)})`,
		};
	}

	const removeOutdatedStudents = parseOptionalBoolean(record.removeOutdatedStudents, 'removeOutdatedStudents');
	if (!removeOutdatedStudents.ok) return removeOutdatedStudents;

	const useLessonTypeAliases = parseOptionalBoolean(record.useLessonTypeAliases, 'useLessonTypeAliases');
	if (!useLessonTypeAliases.ok) return useLessonTypeAliases;

	const aliasesParsed = parseLessonTypeAliases(record.lessonTypeAliases);
	if (!aliasesParsed.ok) return aliasesParsed;

	return {
		ok: true,
		value: {
			minAgreementEndDate,
			removeOutdatedStudents: removeOutdatedStudents.value,
			useLessonTypeAliases: useLessonTypeAliases.value,
			lessonTypeAliases: aliasesParsed.value,
		},
	};
}

function parseOptionalBoolean(raw: unknown, key: string): { ok: true; value: boolean } | { ok: false; error: string } {
	if (raw === undefined) return { ok: true, value: false };
	if (typeof raw !== 'boolean') {
		return { ok: false, error: `settings.json ${key} must be a boolean (got ${JSON.stringify(raw)})` };
	}
	return { ok: true, value: raw };
}

/**
 * Keep agreement when no cutoff is set, when end is open (`null`), or when end is on/after the cutoff.
 */
export function passesMinAgreementEndDate(endDate: string | null, minAgreementEndDate: string | null): boolean {
	if (minAgreementEndDate == null) return true;
	if (endDate == null) return true;
	return endDate >= minAgreementEndDate;
}
