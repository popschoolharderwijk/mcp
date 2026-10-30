import { deriveEndDateFromLessonCount } from '../agreements_courses/deriveAgreementEndDateHelpers';
import { computeGroupAgendaStartDate } from '../agreements_courses/groupLessonImportHelpers';
import type { LessonFrequency, ScheduleFrequencyEntry } from '../courses/types';
import { normalizeIsoDate } from './dateHelpers';
import { asFiniteNumber } from './numberHelpers';
import { extractMongoOid } from './parseMongoExportHelpers';
import { pickLatestScheduleSlot } from './scheduleSlotHelpers';

function asOptionalTrimmedString(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

/** Positive integer lesson count from Mongo `numberoflessons`, or null. */
export function readPositiveLessonCount(value: unknown): number | null {
	const n = asFiniteNumber(value);
	if (n == null || !Number.isInteger(n) || n < 1) return null;
	return n;
}

/**
 * Prefer explicit enddate; else for non-autorenewal packages derive from
 * first weekday-aligned occurrence + (n - 1) frequency intervals.
 */
export function resolveAgreementEndDate(
	record: Record<string, unknown>,
	explicitEndDate: string | null,
	startDate: string,
	dayOfWeek: number,
	frequency: LessonFrequency,
): string | null {
	if (explicitEndDate != null) return explicitEndDate;
	if (record.autorenewal !== false) return null;
	const numberOfLessons = readPositiveLessonCount(record.numberoflessons);
	if (numberOfLessons == null) return null;
	const firstOccurrence = computeGroupAgendaStartDate(startDate, dayOfWeek);
	return deriveEndDateFromLessonCount(firstOccurrence, frequency, numberOfLessons);
}

/**
 * Best-effort end date for settings filters (same rules as the agreements mapper).
 * Returns `ok: false` when the doc cannot yield a reliable end date.
 */
export function peekAgreementEndDateForCutoff(
	doc: unknown,
	scheduleFrequencyMap: ReadonlyMap<string, ScheduleFrequencyEntry>,
): { ok: true; endDate: string | null } | { ok: false } {
	if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
		return { ok: false };
	}
	const record = doc as Record<string, unknown>;

	const startDate = normalizeIsoDate(asOptionalTrimmedString(record.startdate));
	if (!startDate) return { ok: false };

	const endDateRaw = asOptionalTrimmedString(record.enddate);
	let explicitEndDate: string | null = null;
	if (endDateRaw != null) {
		explicitEndDate = normalizeIsoDate(endDateRaw);
		if (!explicitEndDate) return { ok: false };
		if (explicitEndDate < startDate) return { ok: false };
	}

	const scheduleSlot = pickLatestScheduleSlot(record.schedule);
	if (!scheduleSlot) return { ok: false };

	const durationFreqOid = extractMongoOid(record.durationfreq);
	if (!durationFreqOid) return { ok: false };
	const scheduleEntry = scheduleFrequencyMap.get(durationFreqOid);
	if (!scheduleEntry) return { ok: false };

	return {
		ok: true,
		endDate: resolveAgreementEndDate(
			record,
			explicitEndDate,
			startDate,
			scheduleSlot.dayOfWeek,
			scheduleEntry.frequency,
		),
	};
}
