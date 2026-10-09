import { describe, expect, it } from 'bun:test';
import { emptyProfileAddressForm } from '../../../src/lib/profile/profileAddressHelpers';
import {
	resolveTeacherAddressBootstrap,
	resolveTeacherAddressSaveBlock,
	teacherAddressFormFromValueKey,
	teacherAddressValueKey,
} from '../../../src/lib/teachers/teacherAddressSectionHelpers';

describe('resolveTeacherAddressBootstrap', () => {
	it('starts empty and loading when no initial address is provided', () => {
		expect(resolveTeacherAddressBootstrap(undefined)).toEqual({
			hasInitial: false,
			form: emptyProfileAddressForm,
			loading: true,
		});
	});

	it('hydrates from initial address without loading', () => {
		expect(
			resolveTeacherAddressBootstrap({
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

describe('teacherAddressValueKey', () => {
	it('returns null when initial address is missing', () => {
		expect(teacherAddressValueKey(undefined)).toBeNull();
		expect(teacherAddressValueKey(null)).toBeNull();
	});

	it('is stable for the same field values regardless of object identity', () => {
		const fields = {
			street_name: 'Hoofdstraat',
			house_number: '12',
			postal_code: '1234AB',
			city: 'Amsterdam',
			country_code: 'NL',
		};
		expect(teacherAddressValueKey(fields)).toBe(teacherAddressValueKey({ ...fields }));
	});

	it('changes when a field value changes', () => {
		expect(
			teacherAddressValueKey({
				street_name: 'A',
				house_number: '1',
				postal_code: '1234AB',
				city: 'Amsterdam',
				country_code: 'NL',
			}),
		).not.toBe(
			teacherAddressValueKey({
				street_name: 'B',
				house_number: '1',
				postal_code: '1234AB',
				city: 'Amsterdam',
				country_code: 'NL',
			}),
		);
	});
});

describe('teacherAddressFormFromValueKey', () => {
	it('round-trips fields through the value key', () => {
		expect(teacherAddressFormFromValueKey('Hoofdstraat\u000112\u00011234AB\u0001Amsterdam\u0001NL')).toEqual({
			street_name: 'Hoofdstraat',
			house_number: '12',
			postal_code: '1234AB',
			city: 'Amsterdam',
			country_code: 'NL',
		});
	});
});

describe('resolveTeacherAddressSaveBlock', () => {
	it('blocks invalid NL postcodes', () => {
		expect(
			resolveTeacherAddressSaveBlock({
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
			resolveTeacherAddressSaveBlock({
				...emptyProfileAddressForm,
				street_name: 'Hoofdstraat',
				house_number: '12',
				country_code: 'NL',
			}),
		).toEqual({ blocked: false });
	});
});
