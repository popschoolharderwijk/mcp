import { describe, expect, it } from 'bun:test';
import { buildCoursePriceIndex, lookupCoursePrice, resolveAgreementCoursePrice } from './coursePriceIndexHelpers';

describe('buildCoursePriceIndex / resolveAgreementCoursePrice', () => {
	it('keeps the latest positive price per course and durationfreq', () => {
		const index = buildCoursePriceIndex([
			{
				_id: { $oid: 'course-1' },
				frequency_mnd_prices: [
					{ durationfreq: { $oid: 'df-1' }, price: 10, startdate: '2025-01-01' },
					{ durationfreq: { $oid: 'df-1' }, price: 20, startdate: '2026-01-01' },
					{ durationfreq: { $oid: 'df-2' }, price: 0, startdate: '2026-01-01' },
					{ durationfreq: { $oid: 'df-2' }, price: 15, startdate: '2025-06-01' },
				],
			},
		]);

		expect(lookupCoursePrice(index, 'course-1', 'df-1')).toBe(20);
		expect(lookupCoursePrice(index, 'course-1', 'df-2')).toBe(15);
		expect(resolveAgreementCoursePrice(index, 'course-1', 'df-1')).toEqual({
			price: 20,
			synthesizeLessonTypeOption: false,
		});
	});

	it('falls back to top-level course price and marks the option for synthesis', () => {
		const index = buildCoursePriceIndex([
			{
				_id: { $oid: 'course-band' },
				price: 16.34,
				frequency_mnd_prices: [
					{ durationfreq: { $oid: 'df-13' }, price: 16.34, startdate: '2025-09-01' },
					{ durationfreq: { $oid: 'df-07' }, price: 16.91, startdate: '2026-09-01' },
				],
			},
		]);

		expect(resolveAgreementCoursePrice(index, 'course-band', 'df-12')).toEqual({
			price: 16.34,
			synthesizeLessonTypeOption: true,
		});
		expect(resolveAgreementCoursePrice(index, 'missing', 'df-12')).toBeNull();
	});
});
