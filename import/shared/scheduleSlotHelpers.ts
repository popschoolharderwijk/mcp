import { toAmsterdamScheduleSlot, toAmsterdamYmd } from './dateHelpers';

function parseScheduleInstant(value: unknown): Date | null {
	if (typeof value !== 'string' || value.trim() === '') return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

type ScheduleSlotCandidate = {
	start: Date;
	processedAtMs: number | null;
};

function readScheduleSlotCandidate(item: unknown): ScheduleSlotCandidate | null {
	if (item === null || typeof item !== 'object' || Array.isArray(item)) return null;
	const record = item as Record<string, unknown>;
	const start = parseScheduleInstant(record.startdatetime);
	if (!start) return null;
	const processedAt = parseScheduleInstant(record.processed_at);
	return { start, processedAtMs: processedAt ? processedAt.getTime() : null };
}

/** Prefer later processed_at; fall back to later startdatetime when processed_at is missing/tied. */
function isPreferableScheduleSlot(candidate: ScheduleSlotCandidate, current: ScheduleSlotCandidate): boolean {
	const candidateProcessed = candidate.processedAtMs;
	const currentProcessed = current.processedAtMs;
	if (candidateProcessed !== null || currentProcessed !== null) {
		const candidateRank = candidateProcessed ?? Number.NEGATIVE_INFINITY;
		const currentRank = currentProcessed ?? Number.NEGATIVE_INFINITY;
		if (candidateRank !== currentRank) return candidateRank > currentRank;
	}
	return candidate.start.getTime() > current.start.getTime();
}

export type PickedScheduleSlot = {
	dayOfWeek: number;
	startTime: string;
	/** Europe/Amsterdam calendar date of the chosen schedule instant. */
	slotDate: string;
};

/**
 * Current schedule slot → day_of_week + start_time in Europe/Amsterdam.
 * Uses the Amsterdam calendar day of the latest startdatetime; when several slots share
 * that day (e.g. a corrected time), the latest processed_at wins.
 */
export function pickLatestScheduleSlot(schedule: unknown): PickedScheduleSlot | null {
	if (!Array.isArray(schedule)) return null;

	const candidates: ScheduleSlotCandidate[] = [];
	for (const item of schedule) {
		const candidate = readScheduleSlotCandidate(item);
		if (candidate) candidates.push(candidate);
	}
	if (candidates.length === 0) return null;

	let latestStart = candidates[0].start;
	for (const candidate of candidates) {
		if (candidate.start.getTime() > latestStart.getTime()) latestStart = candidate.start;
	}
	const latestDay = toAmsterdamYmd(latestStart);

	let best: ScheduleSlotCandidate | null = null;
	for (const candidate of candidates) {
		if (toAmsterdamYmd(candidate.start) !== latestDay) continue;
		if (!best || isPreferableScheduleSlot(candidate, best)) best = candidate;
	}
	if (!best) return null;

	const slot = toAmsterdamScheduleSlot(best.start);
	return { ...slot, slotDate: toAmsterdamYmd(best.start) };
}
