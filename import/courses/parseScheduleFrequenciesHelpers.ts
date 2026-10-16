import { extractMongoOid } from '../shared/parseMongoExportHelpers';
import type { LessonFrequency, ScheduleFrequencyEntry } from './types';

const VALUE_RE = /^1x(\d+)m\/(\d+)wk$/;

function weeksToFrequency(weeks: number): LessonFrequency | null {
	if (weeks === 1) return 'weekly';
	if (weeks === 2) return 'biweekly';
	if (weeks === 4) return 'monthly';
	return null;
}

/** Parse schedule_frequencies `value` like `1x30m/1wk` into duration + frequency. */
export function parseScheduleFrequencyValue(value: string): ScheduleFrequencyEntry | null {
	const match = VALUE_RE.exec(value.trim());
	if (!match) return null;
	const durationMinutes = Number(match[1]);
	const weeks = Number(match[2]);
	if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return null;
	const frequency = weeksToFrequency(weeks);
	if (!frequency) return null;
	return { durationMinutes, frequency };
}

/**
 * Build oid → duration/frequency map from schedule_frequencies export docs.
 * Uses `value`, not `label`.
 */
export function buildScheduleFrequencyMap(docs: unknown[]): Map<string, ScheduleFrequencyEntry> {
	const map = new Map<string, ScheduleFrequencyEntry>();
	for (const doc of docs) {
		if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) continue;
		const record = doc as Record<string, unknown>;
		const oid = extractMongoOid(record._id);
		if (!oid || typeof record.value !== 'string') continue;
		const parsed = parseScheduleFrequencyValue(record.value);
		if (!parsed) continue;
		map.set(oid, parsed);
	}
	return map;
}
