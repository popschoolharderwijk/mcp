import { asFiniteNumber } from '../shared/numberHelpers';
import { extractMongoOid } from '../shared/parseMongoExportHelpers';
import type { LessonFrequency, MappedCourseOption, ScheduleFrequencyEntry } from './types';

export type CoursePriceEntry = {
	durationFreqOid: string;
	price: number;
	startDate: string;
};

export function readFrequencyPriceEntries(raw: unknown): CoursePriceEntry[] {
	if (!Array.isArray(raw)) return [];
	const entries: CoursePriceEntry[] = [];
	for (const item of raw) {
		if (item === null || typeof item !== 'object' || Array.isArray(item)) continue;
		const record = item as Record<string, unknown>;
		const oid =
			typeof record.durationfreq === 'string' ? record.durationfreq : extractMongoOid(record.durationfreq);
		const price = asFiniteNumber(record.price);
		if (!oid || price == null) continue;
		const startDate = typeof record.startdate === 'string' ? record.startdate : '';
		entries.push({ durationFreqOid: oid, price, startDate });
	}
	return entries;
}

export function pickLatestCourseOptions(
	entries: CoursePriceEntry[],
	scheduleFrequencyMap: Map<string, ScheduleFrequencyEntry>,
	under21Cents: number | null,
): { options: MappedCourseOption[]; warnings: string[] } {
	const latest = new Map<
		string,
		{ durationMinutes: number; frequency: LessonFrequency; price: number; startDate: string }
	>();
	const warnings: string[] = [];

	for (const entry of entries) {
		const schedule = scheduleFrequencyMap.get(entry.durationFreqOid);
		if (!schedule) {
			warnings.push(`Unknown durationfreq oid ${entry.durationFreqOid}`);
			continue;
		}
		if (entry.price <= 0) continue;
		const key = `${schedule.durationMinutes}:${schedule.frequency}`;
		const existing = latest.get(key);
		if (!existing || entry.startDate > existing.startDate) {
			latest.set(key, {
				durationMinutes: schedule.durationMinutes,
				frequency: schedule.frequency,
				price: entry.price,
				startDate: entry.startDate,
			});
		}
	}

	const options: MappedCourseOption[] = [...latest.values()]
		.sort((a, b) => {
			if (a.durationMinutes !== b.durationMinutes) return a.durationMinutes - b.durationMinutes;
			return a.frequency.localeCompare(b.frequency);
		})
		.map((opt) => ({
			durationMinutes: opt.durationMinutes,
			frequency: opt.frequency,
			pricePerLesson: opt.price,
			pricePerLessonUnder21Cents: under21Cents,
			startDate: opt.startDate || null,
			skippedUnknownOid: null,
		}));

	return { options, warnings };
}
