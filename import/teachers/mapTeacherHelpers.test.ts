import { beforeEach, describe, expect, it } from 'bun:test';
import { classifyTeacherKeys, mapTeacherDoc, resetTeacherEmailDedup } from './mapTeacherHelpers';

describe('classifyTeacherKeys', () => {
	it('splits unmapped keys into skipped vs intentionally ignored', () => {
		expect(
			classifyTeacherKeys({
				_id: { $oid: 'oid-1' },
				name: 'Femke',
				surname: 'Bosman',
				email: 'a@example.com',
				phone: '0612345678',
				instrument: 'zang',
				vogdateissued: '2023-12-06',
				vog: true,
				comments: 'x',
				assets: null,
				mystery_field: 1,
			}),
		).toEqual({
			skippedKeys: ['mystery_field'],
			ignoredKeys: ['assets', 'comments', 'instrument', 'vog'],
		});
	});
});

describe('mapTeacherDoc', () => {
	beforeEach(() => {
		resetTeacherEmailDedup();
	});

	it('maps a complete teacher document without instrument links', () => {
		const result = mapTeacherDoc({
			_id: { $oid: '65deed9a4ab30f9a3714f069' },
			name: 'Femke',
			surname: 'Bosman',
			email: 'Thomas_Kok68_anon@kpnmail.nl',
			phone: '06-94350865',
			instrument: 'zang',
			vog: true,
			vogdateissued: '2023-12-06',
			street: 'Voorbeeldstraat',
			houseno: 12,
			housenoadd: 'A',
			zip: '1234 AB',
			city: 'Amsterdam',
			country: 'nl',
			note_to_teacher: 'Note one',
			comments: 'Comment two',
			assets: { $oid: '6658542bcf2cb83e6b75993c' },
			user: '70e1238b-11e5-4a6d-8711-ff550716e7a6',
		});

		expect(result).toEqual({
			ok: true,
			row: {
				mongoOid: '65deed9a4ab30f9a3714f069',
				email: 'Thomas_Kok68_anon@kpnmail.nl',
				emailWarning: null,
				firstName: 'Femke',
				lastName: 'Bosman',
				phoneNumber: '0694350865',
				streetName: 'Voorbeeldstraat',
				houseNumber: '12A',
				postalCode: '1234 AB',
				city: 'Amsterdam',
				countryCode: 'NL',
				cocIssuedOn: '2023-12-06',
				invalidCocIssuedOn: null,
				invalidCountryCode: null,
			},
		});
	});

	it('appends trimmed housenoadd onto houseno', () => {
		expect(
			mapTeacherDoc({
				_id: { $oid: 'oid-house' },
				name: 'Noa',
				surname: 'Noa',
				email: 'noa@example.com',
				houseno: ' 12 ',
				housenoadd: ' A ',
			}),
		).toEqual({
			ok: true,
			row: {
				mongoOid: 'oid-house',
				email: 'noa@example.com',
				emailWarning: null,
				firstName: 'Noa',
				lastName: 'Noa',
				phoneNumber: null,
				streetName: null,
				houseNumber: '12A',
				postalCode: null,
				city: null,
				countryCode: 'NL',
				cocIssuedOn: null,
				invalidCocIssuedOn: null,
				invalidCountryCode: null,
			},
		});
	});

	it('maps country name Nederland to NL without warning', () => {
		expect(
			mapTeacherDoc({
				_id: { $oid: 'oid-nederland' },
				name: 'Noa',
				surname: 'Noa',
				email: 'noa@example.com',
				country: 'Nederland',
			}),
		).toEqual({
			ok: true,
			row: {
				mongoOid: 'oid-nederland',
				email: 'noa@example.com',
				emailWarning: null,
				firstName: 'Noa',
				lastName: 'Noa',
				phoneNumber: null,
				streetName: null,
				houseNumber: null,
				postalCode: null,
				city: null,
				countryCode: 'NL',
				cocIssuedOn: null,
				invalidCocIssuedOn: null,
				invalidCountryCode: null,
			},
		});
	});

	it('warns via invalidCountryCode when country is not ISO alpha-2', () => {
		expect(
			mapTeacherDoc({
				_id: { $oid: 'oid-bad-country' },
				name: 'Noa',
				surname: 'Noa',
				email: 'noa@example.com',
				country: 'Hollandia',
			}),
		).toEqual({
			ok: true,
			row: {
				mongoOid: 'oid-bad-country',
				email: 'noa@example.com',
				emailWarning: null,
				firstName: 'Noa',
				lastName: 'Noa',
				phoneNumber: null,
				streetName: null,
				houseNumber: null,
				postalCode: null,
				city: null,
				countryCode: 'NL',
				cocIssuedOn: null,
				invalidCocIssuedOn: null,
				invalidCountryCode: 'Hollandia',
			},
		});
	});

	it('warns via invalidCocIssuedOn when vogdateissued is not YYYY-MM-DD', () => {
		expect(
			mapTeacherDoc({
				_id: { $oid: 'oid-bad-coc' },
				name: 'Noa',
				surname: 'Noa',
				email: 'noa@example.com',
				vogdateissued: '06-12-2023',
			}),
		).toEqual({
			ok: true,
			row: {
				mongoOid: 'oid-bad-coc',
				email: 'noa@example.com',
				emailWarning: null,
				firstName: 'Noa',
				lastName: 'Noa',
				phoneNumber: null,
				streetName: null,
				houseNumber: null,
				postalCode: null,
				city: null,
				countryCode: 'NL',
				cocIssuedOn: null,
				invalidCocIssuedOn: '06-12-2023',
				invalidCountryCode: null,
			},
		});
	});

	it('maps without email using a null email for placeholder assignment', () => {
		expect(
			mapTeacherDoc({
				_id: { $oid: '65deed9a4ab30f9a3714f071' },
				name: 'Roos',
				surname: 'de Jong',
				email: '',
				phone: '',
			}),
		).toEqual({
			ok: true,
			row: {
				mongoOid: '65deed9a4ab30f9a3714f071',
				email: 'missing_65deed9a4ab30f9a3714f071@example.com',
				emailWarning: 'Missing email; using "missing_65deed9a4ab30f9a3714f071@example.com"',
				firstName: 'Roos',
				lastName: 'de Jong',
				phoneNumber: null,
				streetName: null,
				houseNumber: null,
				postalCode: null,
				city: null,
				countryCode: 'NL',
				cocIssuedOn: null,
				invalidCocIssuedOn: null,
				invalidCountryCode: null,
			},
		});
	});

	it('sets invalid phone to null without failing', () => {
		expect(
			mapTeacherDoc({
				_id: { $oid: 'oid-1' },
				name: 'Noa',
				surname: 'Noa',
				email: 'noa@example.com',
				phone: '070-8360593',
			}),
		).toEqual({
			ok: true,
			row: {
				mongoOid: 'oid-1',
				email: 'noa@example.com',
				emailWarning: null,
				firstName: 'Noa',
				lastName: 'Noa',
				phoneNumber: null,
				streetName: null,
				houseNumber: null,
				postalCode: null,
				city: null,
				countryCode: 'NL',
				cocIssuedOn: null,
				invalidCocIssuedOn: null,
				invalidCountryCode: null,
			},
		});
	});

	it('rewrites duplicate emails with duplicate_N_ prefix', () => {
		expect(
			mapTeacherDoc({
				_id: { $oid: 'oid-first' },
				name: 'First',
				surname: 'Teacher',
				email: 'kevindegroot@gmail.com',
			}).ok,
		).toBe(true);

		expect(
			mapTeacherDoc({
				_id: { $oid: 'oid-second' },
				name: 'Second',
				surname: 'Teacher',
				email: 'kevindegroot@gmail.com',
			}),
		).toEqual({
			ok: true,
			row: {
				mongoOid: 'oid-second',
				email: 'duplicate_1_kevindegroot@gmail.com',
				emailWarning: 'Duplicate email "kevindegroot@gmail.com"; using "duplicate_1_kevindegroot@gmail.com"',
				firstName: 'Second',
				lastName: 'Teacher',
				phoneNumber: null,
				streetName: null,
				houseNumber: null,
				postalCode: null,
				city: null,
				countryCode: 'NL',
				cocIssuedOn: null,
				invalidCocIssuedOn: null,
				invalidCountryCode: null,
			},
		});
	});
});
