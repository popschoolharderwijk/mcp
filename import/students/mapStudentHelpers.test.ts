import { beforeEach, describe, expect, it } from 'bun:test';
import {
	classifyStudentKeys,
	mapStudentDoc,
	resetStudentEmailDedup,
	studentRowWarningReasons,
} from './mapStudentHelpers';

describe('classifyStudentKeys', () => {
	it('splits unmapped keys into skipped vs intentionally ignored', () => {
		expect(
			classifyStudentKeys({
				_id: { $oid: 'oid-1' },
				name: 'Nick',
				surname: 'van de Brink',
				email: 'a@example.com',
				phone: '0612345678',
				birthday: '2009-01-16',
				studentnumber: '9780',
				orgdebnumber: '580005',
				comments: 'x',
				mystery_field: 1,
			}),
		).toEqual({
			skippedKeys: ['mystery_field'],
			ignoredKeys: ['comments', 'orgdebnumber', 'studentnumber'],
		});
	});
});

describe('mapStudentDoc', () => {
	beforeEach(() => {
		resetStudentEmailDedup();
	});

	it('maps a complete student document', () => {
		const result = mapStudentDoc({
			_id: { $oid: '65deed9e3f515bbe5a0eca83' },
			studentnumber: '9780',
			name: 'Nick',
			surname: 'van de Brink',
			street: 'Jesseweg',
			houseno: '210',
			housenoadd: '',
			zip: '6939VK',
			city: 'Vaart',
			country: 'NL',
			phone: '06-21599555',
			email: 'Eva.Koning14_anon@gmail.com',
			birthday: '2009-01-16',
			orgdebnumber: '',
		});

		expect(result).toEqual({
			ok: true,
			row: {
				mongoOid: '65deed9e3f515bbe5a0eca83',
				email: 'Eva.Koning14_anon@gmail.com',
				emailWarning: null,
				firstName: 'Nick',
				lastName: 'van de Brink',
				phoneNumber: '0621599555',
				streetName: 'Jesseweg',
				houseNumber: '210',
				postalCode: '6939VK',
				city: 'Vaart',
				countryCode: 'NL',
				dateOfBirth: '2009-01-16',
				invalidDateOfBirth: null,
				invalidCountryCode: null,
			},
		});
	});

	it('maps without email using a null email for placeholder assignment', () => {
		expect(
			mapStudentDoc({
				_id: { $oid: 'oid-no-email' },
				name: 'Britt',
				surname: 'de Groot',
				email: '',
			}),
		).toEqual({
			ok: true,
			row: {
				mongoOid: 'oid-no-email',
				email: 'missing_oid-no-email@example.com',
				emailWarning: 'Missing email; using "missing_oid-no-email@example.com"',
				firstName: 'Britt',
				lastName: 'de Groot',
				phoneNumber: null,
				streetName: null,
				houseNumber: null,
				postalCode: null,
				city: null,
				countryCode: 'NL',
				dateOfBirth: null,
				invalidDateOfBirth: null,
				invalidCountryCode: null,
			},
		});
	});

	it('rewrites later rows with the same email using duplicate_N_ prefix', () => {
		expect(
			mapStudentDoc({
				_id: { $oid: 'oid-first' },
				name: 'First',
				surname: 'Student',
				email: 'shared@example.com',
			}).ok,
		).toBe(true);

		expect(
			mapStudentDoc({
				_id: { $oid: 'oid-second' },
				name: 'Second',
				surname: 'Student',
				email: 'Shared@example.com',
			}),
		).toEqual({
			ok: true,
			row: {
				mongoOid: 'oid-second',
				email: 'duplicate_1_Shared@example.com',
				emailWarning: 'Duplicate email "Shared@example.com"; using "duplicate_1_Shared@example.com"',
				firstName: 'Second',
				lastName: 'Student',
				phoneNumber: null,
				streetName: null,
				houseNumber: null,
				postalCode: null,
				city: null,
				countryCode: 'NL',
				dateOfBirth: null,
				invalidDateOfBirth: null,
				invalidCountryCode: null,
			},
		});
	});

	it('warns via invalidDateOfBirth when birthday is not YYYY-MM-DD', () => {
		const result = mapStudentDoc({
			_id: { $oid: 'oid-bad-dob' },
			name: 'Noa',
			surname: 'Noa',
			email: 'noa@example.com',
			birthday: '16-01-2009',
		});

		expect(result).toEqual({
			ok: true,
			row: {
				mongoOid: 'oid-bad-dob',
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
				dateOfBirth: null,
				invalidDateOfBirth: '16-01-2009',
				invalidCountryCode: null,
			},
		});
		expect(studentRowWarningReasons(result.ok ? result.row : ({} as never))).toEqual([
			'Invalid birthday "16-01-2009" (expected YYYY-MM-DD)',
		]);
	});

	it('appends trimmed housenoadd onto houseno', () => {
		expect(
			mapStudentDoc({
				_id: { $oid: 'oid-house' },
				name: 'Noa',
				surname: 'Noa',
				email: 'noa-house@example.com',
				houseno: ' 12 ',
				housenoadd: ' A ',
			}),
		).toEqual({
			ok: true,
			row: {
				mongoOid: 'oid-house',
				email: 'noa-house@example.com',
				emailWarning: null,
				firstName: 'Noa',
				lastName: 'Noa',
				phoneNumber: null,
				streetName: null,
				houseNumber: '12A',
				postalCode: null,
				city: null,
				countryCode: 'NL',
				dateOfBirth: null,
				invalidDateOfBirth: null,
				invalidCountryCode: null,
			},
		});
	});
});
