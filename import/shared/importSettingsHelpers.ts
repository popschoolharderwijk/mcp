import { normalizeIsoDate } from './dateHelpers';

export type ImportSettings = {
	/** When set, only import agreements with `endDate` null or `>=` this `YYYY-MM-DD`. */
	minAgreementEndDate: string | null;
	/** When true, only import students who appear on at least one kept agreement. */
	removeOutdatedStudents: boolean;
};

export const DEFAULT_IMPORT_SETTINGS: ImportSettings = {
	minAgreementEndDate: null,
	removeOutdatedStudents: false,
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

	const removeRaw = record.removeOutdatedStudents;
	if (removeRaw === undefined) {
		return { ok: true, value: { minAgreementEndDate, removeOutdatedStudents: false } };
	}
	if (typeof removeRaw !== 'boolean') {
		return {
			ok: false,
			error: `settings.json removeOutdatedStudents must be a boolean (got ${JSON.stringify(removeRaw)})`,
		};
	}

	return {
		ok: true,
		value: { minAgreementEndDate, removeOutdatedStudents: removeRaw },
	};
}

/**
 * Keep agreement when no cutoff is set, when end is open (`null`), or when end is on/after the cutoff.
 */
export function passesMinAgreementEndDate(endDate: string | null, minAgreementEndDate: string | null): boolean {
	if (minAgreementEndDate == null) return true;
	if (endDate == null) return true;
	return endDate >= minAgreementEndDate;
}
