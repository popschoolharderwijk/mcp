import { beforeEach, describe, expect, it } from 'bun:test';
import { mapCourseDoc, setCourseScheduleFrequencyMap } from './mapCourseHelpers';
import type { ScheduleFrequencyEntry } from './types';

const WEEKLY_30: ScheduleFrequencyEntry = { durationMinutes: 30, frequency: 'weekly' };
const BIWEEKLY_30: ScheduleFrequencyEntry = { durationMinutes: 30, frequency: 'biweekly' };

describe('mapCourseDoc', () => {
	beforeEach(() => {
		setCourseScheduleFrequencyMap(
			new Map([
				['oid-weekly-30', WEEKLY_30],
				['oid-biweekly-30', BIWEEKLY_30],
			]),
		);
	});

	it('maps a course with latest price per duration+frequency', () => {
		const result = mapCourseDoc({
			_id: 'course-1',
			name: '09 Gitaar',
			ledgeraccount: '8310',
			maxparticipants: 1,
			price: 19.5,
			frequency_mnd_prices: [
				{ durationfreq: 'oid-weekly-30', price: 70.9, startdate: '2025-09-01' },
				{ durationfreq: 'oid-weekly-30', price: 73.38, startdate: '2026-09-01' },
				{ durationfreq: 'oid-biweekly-30', price: 38.67, startdate: '2026-09-01' },
				{ durationfreq: 'oid-weekly-30', price: 0, startdate: '2027-01-01' },
			],
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.row.isDuoLesson).toBe(false);
		expect(result.row.isGroupLesson).toBe(false);
		expect(result.row.costCenter).toBe('8310');
		expect(result.row.options).toEqual([
			{
				durationMinutes: 30,
				frequency: 'biweekly',
				pricePerLesson: 38.67,
				pricePerLessonYouthCents: 3867,
				pricePerLessonAdultCents: 3867,
				startDate: '2026-09-01',
				skippedUnknownOid: null,
			},
			{
				durationMinutes: 30,
				frequency: 'weekly',
				pricePerLesson: 73.38,
				pricePerLessonYouthCents: 7338,
				pricePerLessonAdultCents: 7338,
				startDate: '2026-09-01',
				skippedUnknownOid: null,
			},
		]);
	});

	it('warns on unknown durationfreq oids', () => {
		const result = mapCourseDoc({
			_id: 'course-2',
			name: 'Test',
			frequency_mnd_prices: [{ durationfreq: 'unknown-oid', price: 10, startdate: '2026-01-01' }],
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.row.options).toEqual([]);
		expect(result.row.optionWarnings).toEqual(['Unknown durationfreq oid unknown-oid']);
	});

	it('fails for invalid documents and missing required fields', () => {
		expect(mapCourseDoc(null)).toEqual({ ok: false, oid: null, reason: 'Document is not an object' });
		expect(mapCourseDoc([])).toEqual({ ok: false, oid: null, reason: 'Document is not an object' });
		expect(mapCourseDoc({ name: 'X' })).toEqual({ ok: false, oid: null, reason: 'Missing _id' });
		expect(mapCourseDoc({ _id: 'oid-3', name: '   ' })).toEqual({
			ok: false,
			oid: 'oid-3',
			reason: 'Missing name',
		});
	});
});
