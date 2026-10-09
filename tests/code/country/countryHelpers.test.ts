import { describe, expect, it } from 'bun:test';
import {
	countryDisplayName,
	countryFlagUrl,
	countryLabelParts,
	countryMatchesSearch,
	isIsoCountryCode,
	listIsoCountryCodes,
} from '../../../src/lib/country/countryHelpers';

describe('isIsoCountryCode', () => {
	it('accepts uppercase ISO alpha-2 codes', () => {
		expect(isIsoCountryCode('NL')).toBe(true);
		expect(isIsoCountryCode('BE')).toBe(true);
	});

	it('rejects invalid codes', () => {
		expect(isIsoCountryCode('nl')).toBe(false);
		expect(isIsoCountryCode('NLD')).toBe(false);
		expect(isIsoCountryCode('')).toBe(false);
	});
});

describe('countryFlagUrl', () => {
	it('returns a flagcdn URL for valid codes', () => {
		expect(countryFlagUrl('NL')).toBe('https://flagcdn.com/w40/nl.png');
	});

	it('returns null for invalid codes', () => {
		expect(countryFlagUrl('NLD')).toBeNull();
	});
});

describe('countryDisplayName', () => {
	it('returns a Dutch display name for the Netherlands', () => {
		expect(countryDisplayName('NL')).toBe('Nederland');
	});
});

describe('countryLabelParts', () => {
	it('returns name and code when they differ', () => {
		expect(countryLabelParts('NL')).toEqual({ name: 'Nederland', code: 'NL' });
	});
});

describe('listIsoCountryCodes', () => {
	it('puts NL and BE first', () => {
		const codes = listIsoCountryCodes();
		expect(codes[0]).toBe('NL');
		expect(codes[1]).toBe('BE');
	});

	it('includes common European codes', () => {
		const codes = listIsoCountryCodes();
		expect(codes.includes('DE')).toBe(true);
		expect(codes.includes('FR')).toBe(true);
	});
});

describe('countryMatchesSearch', () => {
	it('matches by ISO code', () => {
		expect(countryMatchesSearch('NL', 'nl')).toBe(true);
	});

	it('matches by Dutch display name', () => {
		expect(countryMatchesSearch('NL', 'neder')).toBe(true);
	});

	it('rejects unrelated queries', () => {
		expect(countryMatchesSearch('NL', 'belgie')).toBe(false);
	});
});
