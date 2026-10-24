import { describe, expect, it } from 'bun:test';
import { emptyProfileAddressForm } from '../../../src/lib/profile/profileAddressHelpers';
import {
	profileAddressFieldsFromRow,
	profileAddressFormFromValueKey,
	profileAddressValueKey,
	resolveProfileAddressBootstrap,
	resolveProfileAddressSaveBlock,
} from '../../../src/lib/profile/profileAddressSectionHelpers';

describe('resolveProfileAddressBootstrap', () => {
	it('starts empty and loading when no initial address is provided', () => {
		expect(resolveProfileAddressBootstrap(undefined)).toEqual({
			hasInitial: false,
			form: emptyProfileAddressForm,
			loading: true,
		});
	});

	it('hydrates from initial address without loading', () => {
		expect(
			resolveProfileAddressBootstrap({
				street_name: 'Hoofdstraat',
				house_number: '12',
				postal_code: '1234 AB',
				city: 'Amsterdam',
				country_code: 'nl',
			}),
		).toEqual({
			hasInitial: true,
			form: {
				street_name: 'Hoofdstraat',
				house_number: '12',
				postal_code: '1234 AB',
				city: 'Amsterdam',
				country_code: 'NL',
			},
			loading: false,
		});
	});
});

describe('profileAddressValueKey', () => {
	it('returns null when initial address is missing', () => {
		expect(profileAddressValueKey(undefined)).toBeNull();
		expect(profileAddressValueKey(null)).toBeNull();
	});

	it('is stable for the same field values regardless of object identity', () => {
		const fields = {
			street_name: 'Hoofdstraat',
			house_number: '12',
			postal_code: '1234AB',
			city: 'Amsterdam',
			country_code: 'NL',
		};
		expect(profileAddressValueKey(fields)).toBe(profileAddressValueKey({ ...fields }));
	});

	it('changes when a field value changes', () => {
		expect(
			profileAddressValueKey({
				street_name: 'A',
				house_number: '1',
				postal_code: '1234AB',
				city: 'Amsterdam',
				country_code: 'NL',
			}),
		).not.toBe(
			profileAddressValueKey({
				street_name: 'B',
				house_number: '1',
				postal_code: '1234AB',
				city: 'Amsterdam',
				country_code: 'NL',
			}),
		);
	});
});

describe('profileAddressFormFromValueKey', () => {
	it('round-trips fields through the value key', () => {
		expect(profileAddressFormFromValueKey('Hoofdstraat\u000112\u00011234AB\u0001Amsterdam\u0001NL')).toEqual({
			street_name: 'Hoofdstraat',
			house_number: '12',
			postal_code: '1234AB',
			city: 'Amsterdam',
			country_code: 'NL',
		});
	});
});

describe('resolveProfileAddressSaveBlock', () => {
	it('blocks invalid NL postcodes', () => {
		expect(
			resolveProfileAddressSaveBlock({
				...emptyProfileAddressForm,
				country_code: 'NL',
				postal_code: '1234A',
			}),
		).toEqual({
			blocked: true,
			message: 'Postcode moet 4 cijfers zijn, optioneel gevolgd door 2 letters (bijv. 1234AB)',
		});
	});

	it('allows a valid optional address', () => {
		expect(
			resolveProfileAddressSaveBlock({
				...emptyProfileAddressForm,
				street_name: 'Hoofdstraat',
				house_number: '12',
				country_code: 'NL',
			}),
		).toEqual({ blocked: false });
	});
});

describe('profileAddressFieldsFromRow', () => {
	it('maps address fields and defaults country to NL when missing', () => {
		expect(
			profileAddressFieldsFromRow({
				street_name: null,
				house_number: null,
				postal_code: null,
				city: null,
			}),
		).toEqual({
			street_name: null,
			house_number: null,
			postal_code: null,
			city: null,
			country_code: 'NL',
		});
	});

	it('keeps provided address values including country_code', () => {
		expect(
			profileAddressFieldsFromRow({
				street_name: 'Hoofdstraat',
				house_number: '12',
				postal_code: '1234 AB',
				city: 'Amsterdam',
				country_code: 'BE',
			}),
		).toEqual({
			street_name: 'Hoofdstraat',
			house_number: '12',
			postal_code: '1234 AB',
			city: 'Amsterdam',
			country_code: 'BE',
		});
	});
});
