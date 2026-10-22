import { describe, expect, it } from 'bun:test';
import {
	AGENDA_SLOT_MINUTE_OPTIONS,
	agendaEndHourOptionsForStart,
	agendaStartHourOptionsForEnd,
	describeAgendaSetting,
	formatAgendaHourOption,
	isAgendaHourRangeValid,
	withCurrentNumberOption,
} from '../../../src/lib/settings/agendaSettingsHelpers';
import { APP_SETTINGS } from '../../rls/seed-data-constants';

describe('describeAgendaSetting', () => {
	it('describes bootstrap agenda bounds in Dutch', () => {
		expect(describeAgendaSetting(APP_SETTINGS.AGENDA)).toBe(
			'Een agenda dag loopt van 8 uur tot 21 uur, met blokken van 30 minuten.',
		);
	});

	it('reflects custom start, end, and slot length', () => {
		expect(describeAgendaSetting({ start_hour: 7, end_hour: 21, slot_minutes: 30 })).toBe(
			'Een agenda dag loopt van 7 uur tot 21 uur, met blokken van 30 minuten.',
		);
	});
});

describe('formatAgendaHourOption', () => {
	it('formats midnight end as 24:00', () => {
		expect(formatAgendaHourOption(24)).toBe('24:00');
	});

	it('formats morning hours with leading zero', () => {
		expect(formatAgendaHourOption(7)).toBe('07:00');
	});
});

describe('withCurrentNumberOption', () => {
	it('keeps presets when current is already listed', () => {
		expect(withCurrentNumberOption(AGENDA_SLOT_MINUTE_OPTIONS, 30)).toEqual([...AGENDA_SLOT_MINUTE_OPTIONS]);
	});

	it('inserts a stored custom value in sorted order', () => {
		expect(withCurrentNumberOption(AGENDA_SLOT_MINUTE_OPTIONS, 25)).toEqual([
			5, 10, 15, 20, 25, 30, 45, 60, 90, 120,
		]);
	});
});

describe('isAgendaHourRangeValid', () => {
	it('accepts start before end', () => {
		expect(isAgendaHourRangeValid(8, 21)).toBe(true);
	});

	it('rejects start equal to or after end', () => {
		expect(isAgendaHourRangeValid(8, 8)).toBe(false);
		expect(isAgendaHourRangeValid(8, 6)).toBe(false);
	});
});

describe('agenda hour option filters', () => {
	it('limits end hours to after start', () => {
		expect(agendaEndHourOptionsForStart(20)).toEqual([21, 22, 23, 24]);
	});

	it('limits start hours to before end', () => {
		expect(agendaStartHourOptionsForEnd(3)).toEqual([0, 1, 2]);
	});
});
