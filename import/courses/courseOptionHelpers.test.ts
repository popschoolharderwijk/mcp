import { describe, expect, it } from 'bun:test';
import { pickLatestCourseOptions, readFrequencyPriceEntries } from './courseOptionHelpers';

describe('readFrequencyPriceEntries', () => {
	it('returns empty for non-arrays and skips invalid rows', () => {
		expect(readFrequencyPriceEntries(null)).toEqual([]);
		expect(readFrequencyPriceEntries('x')).toEqual([]);
		expect(
			readFrequencyPriceEntries([
				null,
				'bad',
				{ durationfreq: 'oid-1', price: 'nope' },
				{ durationfreq: null, price: 10 },
			]),
		).toEqual([]);
	});

	it('reads string and object durationfreq with numeric prices', () => {
		expect(
			readFrequencyPriceEntries([
				{ durationfreq: 'oid-a', price: 10.5, startdate: '2026-01-01' },
				{ durationfreq: { $oid: 'oid-b' }, price: '20', startdate: 1 },
			]),
		).toEqual([
			{ durationFreqOid: 'oid-a', price: 10.5, startDate: '2026-01-01' },
			{ durationFreqOid: 'oid-b', price: 20, startDate: '' },
		]);
	});
});

describe('pickLatestCourseOptions', () => {
	const schedule = new Map([
		['oid-weekly-30', { durationMinutes: 30, frequency: 'weekly' as const }],
		['oid-biweekly-30', { durationMinutes: 30, frequency: 'biweekly' as const }],
	]);

	it('keeps latest startdate, skips unknowns and non-positive prices', () => {
		const result = pickLatestCourseOptions(
			[
				{ durationFreqOid: 'unknown', price: 9, startDate: '2026-01-01' },
				{ durationFreqOid: 'oid-weekly-30', price: 0, startDate: '2027-01-01' },
				{ durationFreqOid: 'oid-weekly-30', price: 70, startDate: '2025-01-01' },
				{ durationFreqOid: 'oid-weekly-30', price: 73, startDate: '2026-01-01' },
				{ durationFreqOid: 'oid-biweekly-30', price: 38, startDate: '' },
			],
			schedule,
		);
		expect(result.warnings).toEqual(['Unknown durationfreq oid unknown']);
		expect(result.options).toEqual([
			{
				durationMinutes: 30,
				frequency: 'biweekly',
				pricePerLesson: 38,
				pricePerLessonUnder21Cents: 3800,
				pricePerLessonAdultCents: 3800,
				startDate: null,
				skippedUnknownOid: null,
			},
			{
				durationMinutes: 30,
				frequency: 'weekly',
				pricePerLesson: 73,
				pricePerLessonUnder21Cents: 7300,
				pricePerLessonAdultCents: 7300,
				startDate: '2026-01-01',
				skippedUnknownOid: null,
			},
		]);
	});
});
