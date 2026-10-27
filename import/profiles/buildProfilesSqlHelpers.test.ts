import { describe, expect, it } from 'bun:test';
import { buildProfilesSql } from './buildProfilesSqlHelpers';
import type { ProfileSqlRow } from './types';

const sample: ProfileSqlRow = {
	userId: '11111111-1111-1111-1111-111111111111',
	email: 'shared@example.com',
	firstName: 'Alex',
	lastName: 'Both',
	phoneNumber: null,
	streetName: null,
	houseNumber: null,
	postalCode: null,
	city: null,
	countryCode: 'NL',
	isTeacher: true,
	isStudent: true,
	cocIssuedOn: '2023-01-01',
	dateOfBirth: '1990-05-05',
};

describe('buildProfilesSql', () => {
	it('emits auth and profiles only (no role tables)', () => {
		const sql = buildProfilesSql([sample]);
		expect(sql).toContain('INSERT INTO auth.users');
		expect(sql).toContain('UPDATE public.profiles');
		expect(sql).not.toContain('INSERT INTO public.teachers');
		expect(sql).not.toContain('INSERT INTO public.students');
		expect(sql).toContain('shared@example.com');
		expect(sql).toContain("'11111111-1111-1111-1111-111111111111'::uuid");
	});
});
