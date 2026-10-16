import { describe, expect, it } from 'bun:test';
import { normalizeIsoCountryCode } from './mapPersonFieldHelpers';

describe('normalizeIsoCountryCode', () => {
	it('accepts ISO alpha-2 codes', () => {
		expect(normalizeIsoCountryCode('nl')).toEqual({ countryCode: 'NL', invalidCountryCode: null });
		expect(normalizeIsoCountryCode('BE')).toEqual({ countryCode: 'BE', invalidCountryCode: null });
	});

	it('maps Nederland to NL without marking invalid', () => {
		expect(normalizeIsoCountryCode('Nederland')).toEqual({
			countryCode: 'NL',
			invalidCountryCode: null,
		});
		expect(normalizeIsoCountryCode('nederland')).toEqual({
			countryCode: 'NL',
			invalidCountryCode: null,
		});
	});

	it('defaults unknown names to NL and records the invalid value', () => {
		expect(normalizeIsoCountryCode('Hollandia')).toEqual({
			countryCode: 'NL',
			invalidCountryCode: 'Hollandia',
		});
	});
});
