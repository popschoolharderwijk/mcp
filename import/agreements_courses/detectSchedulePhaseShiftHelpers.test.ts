import { describe, expect, it } from 'bun:test';
import { buildExpectedOccurrenceDates, detectSchedulePhaseShift } from './detectSchedulePhaseShiftHelpers';

describe('buildExpectedOccurrenceDates', () => {
	it('emits biweekly Wednesdays from an aligned start', () => {
		expect(buildExpectedOccurrenceDates('2026-03-11', 3, 'biweekly', '2026-04-08', null)).toEqual([
			'2026-03-11',
			'2026-03-25',
			'2026-04-08',
		]);
	});
});

describe('detectSchedulePhaseShift', () => {
	it('detects a permanent +7d biweekly phase shift (Mike / CA11364 shape)', () => {
		const actualDates = [
			'2026-07-15',
			'2026-09-09',
			'2026-09-23',
			'2026-10-07',
			'2026-10-28',
			'2026-11-11',
			'2026-11-25',
			'2026-12-09',
			'2027-01-06',
			'2027-01-20',
			'2027-02-03',
			'2027-02-17',
			'2027-03-10',
			'2027-03-24',
			'2027-04-07',
			'2027-04-21',
			'2027-05-19',
			'2027-06-02',
			'2027-06-16',
			'2027-06-30',
			'2027-07-14',
		];

		expect(
			detectSchedulePhaseShift({
				startDate: '2026-03-11',
				dayOfWeek: 3,
				frequency: 'biweekly',
				endDate: null,
				actualDates,
			}),
		).toEqual({
			originalDate: '2026-10-21',
			actualDate: '2026-10-28',
			offsetDays: 7,
			foldedEventCount: 8,
			frequency: 'biweekly',
		});
	});

	it('returns null when actual dates stay on the expected grid', () => {
		expect(
			detectSchedulePhaseShift({
				startDate: '2026-03-11',
				dayOfWeek: 3,
				frequency: 'biweekly',
				endDate: null,
				actualDates: ['2026-03-11', '2026-03-25', '2026-04-08', '2026-04-22'],
			}),
		).toBeNull();
	});

	it('returns null for a one-off off-grid date without a continuing suffix', () => {
		expect(
			detectSchedulePhaseShift({
				startDate: '2026-03-11',
				dayOfWeek: 3,
				frequency: 'biweekly',
				endDate: null,
				actualDates: ['2026-03-11', '2026-03-25', '2026-04-01', '2026-04-08', '2026-04-22'],
			}),
		).toBeNull();
	});

	it('returns null for monthly frequency', () => {
		expect(
			detectSchedulePhaseShift({
				startDate: '2026-03-11',
				dayOfWeek: 3,
				frequency: 'monthly',
				endDate: null,
				actualDates: ['2026-03-11', '2026-04-11', '2026-05-18', '2026-06-18'],
			}),
		).toBeNull();
	});
});
