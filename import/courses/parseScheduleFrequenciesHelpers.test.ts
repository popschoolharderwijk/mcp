import { describe, expect, it } from 'bun:test';
import { buildScheduleFrequencyMap, parseScheduleFrequencyValue } from './parseScheduleFrequenciesHelpers';

describe('parseScheduleFrequencyValue', () => {
	it('maps 1wk / 2wk / 4wk values', () => {
		expect(parseScheduleFrequencyValue('1x30m/1wk')).toEqual({
			durationMinutes: 30,
			frequency: 'weekly',
		});
		expect(parseScheduleFrequencyValue('1x60m/2wk')).toEqual({
			durationMinutes: 60,
			frequency: 'biweekly',
		});
		expect(parseScheduleFrequencyValue('1x45m/4wk')).toEqual({
			durationMinutes: 45,
			frequency: 'monthly',
		});
	});

	it('rejects invalid values', () => {
		expect(parseScheduleFrequencyValue('bad')).toBeNull();
		expect(parseScheduleFrequencyValue('1x30m/3wk')).toBeNull();
	});
});

describe('buildScheduleFrequencyMap', () => {
	it('indexes by oid and prefers value over label', () => {
		const map = buildScheduleFrequencyMap([
			{
				_id: '68a30960bb85d8b750036b17',
				label: '75 minuten, 1 keer in de 2 weken',
				value: '1x75m/4wk',
			},
		]);
		expect(map.get('68a30960bb85d8b750036b17')).toEqual({
			durationMinutes: 75,
			frequency: 'monthly',
		});
	});
});
