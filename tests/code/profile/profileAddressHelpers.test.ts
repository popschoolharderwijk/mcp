import { describe, expect, it } from 'bun:test';
import {
	buildProfileAddressUpdateFields,
	DEFAULT_COUNTRY_CODE,
	emptyProfileAddressForm,
	getProfileAddressValidationError,
	normalizeCountryCode,
	profileAddressFormFromFields,
} from '../../../src/lib/profile/profileAddressHelpers';

describe('profileAddressFormFromFields', () => {
	it('maps null fields to empty strings and defaults country code to NL', () => {
		expect(
			profileAddressFormFromFields({
				street_name: null,
				house_number: '12A',
				postal_code: '1234ab',
				city: 'Amsterdam',
				country_code: 'nl',
			}),
		).toEqual({
			street_name: '',
			house_number: '12A',
			postal_code: '1234ab',
			city: 'Amsterdam',
			country_code: 'NL',
		});
	});

	it('returns empty form with default country when fields are missing', () => {
		expect(profileAddressFormFromFields(undefined)).toEqual(emptyProfileAddressForm);
		expect(emptyProfileAddressForm.country_code).toBe(DEFAULT_COUNTRY_CODE);
	});
});

describe('buildProfileAddressUpdateFields', () => {
	it('maps blank strings to null and defaults blank country code to NL', () => {
		expect(
			buildProfileAddressUpdateFields({
				street_name: '  Hoofdstraat  ',
				house_number: '12A',
				postal_code: '1234AB',
				city: '  Amsterdam ',
				country_code: ' be ',
			}),
		).toEqual({
			street_name: 'Hoofdstraat',
			house_number: '12A',
			postal_code: '1234AB',
			city: 'Amsterdam',
			country_code: 'BE',
		});
	});

	it('strips spaces and uppercases NL postcodes on save', () => {
		expect(
			buildProfileAddressUpdateFields({
				...emptyProfileAddressForm,
				postal_code: '1234 ab',
				country_code: 'NL',
			}),
		).toEqual({
			street_name: null,
			house_number: null,
			postal_code: '1234AB',
			city: null,
			country_code: 'NL',
		});
	});

	it('allows digits-only NL postcodes on save', () => {
		expect(
			buildProfileAddressUpdateFields({
				...emptyProfileAddressForm,
				postal_code: '1234',
				country_code: 'NL',
			}).postal_code,
		).toBe('1234');
	});
});

describe('normalizeCountryCode', () => {
	it('returns NL for blank values', () => {
		expect(normalizeCountryCode('')).toBe('NL');
		expect(normalizeCountryCode('   ')).toBe('NL');
		expect(normalizeCountryCode(null)).toBe('NL');
	});
});

describe('getProfileAddressValidationError', () => {
	it('allows empty country code (defaults to NL on save)', () => {
		expect(getProfileAddressValidationError({ ...emptyProfileAddressForm, country_code: '' })).toBeNull();
	});

	it('rejects country codes that are not two letters', () => {
		expect(
			getProfileAddressValidationError({
				...emptyProfileAddressForm,
				country_code: 'NLD',
			}),
		).toBe('Landcode moet uit 2 letters bestaan (ISO 3166-1 alpha-2)');
	});

	it('accepts a two-letter country code', () => {
		expect(
			getProfileAddressValidationError({
				...emptyProfileAddressForm,
				country_code: 'NL',
			}),
		).toBeNull();
	});

	it('rejects invalid NL postcodes', () => {
		expect(
			getProfileAddressValidationError({
				...emptyProfileAddressForm,
				country_code: 'NL',
				postal_code: '1234A',
			}),
		).toBe('Postcode moet 4 cijfers zijn, optioneel gevolgd door 2 letters (bijv. 1234AB)');
	});

	it('accepts spaced NL postcodes that normalize to a valid shape', () => {
		expect(
			getProfileAddressValidationError({
				...emptyProfileAddressForm,
				country_code: 'NL',
				postal_code: '1234 ab',
			}),
		).toBeNull();
	});

	it('does not apply NL postcode rules for other countries', () => {
		expect(
			getProfileAddressValidationError({
				...emptyProfileAddressForm,
				country_code: 'BE',
				postal_code: '1000',
			}),
		).toBeNull();
	});
});
