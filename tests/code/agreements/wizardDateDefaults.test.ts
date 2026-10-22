import { describe, expect, it } from 'bun:test';
import {
	wizardDefaultEndDate,
	wizardDefaultStartDate,
} from '../../../src/components/agreements/wizard/wizardDateDefaults';
import { resolveDefaultAgreementEndDate } from '../../../src/lib/billing/schoolYear';
import { addDaysFromNow, formatDateToDb } from '../../../src/lib/date/date-format';
import { APP_SETTINGS } from '../../rls/seed-data-constants';

describe('wizardDateDefaults', () => {
	it('uses agreements start offset from bootstrap settings', () => {
		expect(wizardDefaultStartDate(APP_SETTINGS.AGREEMENTS)).toBe(
			formatDateToDb(addDaysFromNow(APP_SETTINGS.AGREEMENTS.default_start_offset_days)),
		);
	});

	it('uses school year end from bootstrap settings', () => {
		const asOf = new Date('2026-10-15T12:00:00');
		expect(wizardDefaultEndDate(APP_SETTINGS.SCHOOL_YEAR, asOf)).toBe(
			resolveDefaultAgreementEndDate(asOf, APP_SETTINGS.SCHOOL_YEAR),
		);
		expect(wizardDefaultEndDate(APP_SETTINGS.SCHOOL_YEAR, asOf)).toBe('2027-07-31');
	});

	it('returns database-formatted date strings', () => {
		expect(wizardDefaultStartDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(wizardDefaultEndDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});
});
