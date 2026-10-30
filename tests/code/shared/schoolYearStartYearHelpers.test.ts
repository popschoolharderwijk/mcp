import { describe, expect, it } from 'bun:test';
import { resolveSchoolYearStartAndEndYear } from '../../../supabase/functions/_shared/schoolYearStartYearHelpers';

describe('resolveSchoolYearStartAndEndYear', () => {
	const sepStart = 901;
	const julEnd = 731;

	it('places September in the calendar year school year', () => {
		expect(resolveSchoolYearStartAndEndYear(2026, 915, sepStart, julEnd)).toEqual({
			startYear: 2026,
			endYear: 2027,
		});
	});

	it('places January in the previous calendar start year', () => {
		expect(resolveSchoolYearStartAndEndYear(2027, 110, sepStart, julEnd)).toEqual({
			startYear: 2026,
			endYear: 2027,
		});
	});

	it('places August in the upcoming school year when bounds wrap the calendar', () => {
		expect(resolveSchoolYearStartAndEndYear(2026, 820, sepStart, julEnd)).toEqual({
			startYear: 2026,
			endYear: 2027,
		});
	});

	it('uses one calendar year when start month is before end month', () => {
		expect(resolveSchoolYearStartAndEndYear(2026, 315, 103, 630)).toEqual({
			startYear: 2026,
			endYear: 2026,
		});
	});
});
