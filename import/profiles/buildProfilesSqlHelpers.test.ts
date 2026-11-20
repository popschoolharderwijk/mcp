import { describe, expect, it } from 'bun:test';
import { buildProfilesSql } from './buildProfilesSqlHelpers';
import type { ProfileSqlRow } from './types';

const owner: ProfileSqlRow = {
	userId: '11111111-1111-1111-1111-111111111111',
	email: 'shared@example.com',
	loginUserId: '11111111-1111-1111-1111-111111111111',
	membershipRole: 'owner',
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

const member: ProfileSqlRow = {
	...owner,
	userId: '22222222-2222-2222-2222-222222222222',
	email: null,
	loginUserId: '11111111-1111-1111-1111-111111111111',
	membershipRole: 'member',
	isTeacher: false,
	isStudent: true,
	cocIssuedOn: null,
	dateOfBirth: '2012-01-01',
	firstName: 'Kid',
	lastName: 'Both',
};

describe('buildProfilesSql', () => {
	it('emits owner auth users, member profiles, and memberships', () => {
		const sql = buildProfilesSql([owner, member]);
		expect(sql).toContain('INSERT INTO auth.users');
		expect(sql).toContain("WHERE membership_role = 'owner'");
		expect(sql).toContain('INSERT INTO public.profiles');
		expect(sql).toContain("WHERE membership_role = 'member'");
		expect(sql).toContain('INSERT INTO public.account_memberships');
		expect(sql).not.toContain('INSERT INTO public.teachers');
		expect(sql).not.toContain('INSERT INTO public.students');
		expect(sql).toContain('shared@example.com');
		expect(sql).toContain("'11111111-1111-1111-1111-111111111111'::uuid");
		expect(sql).toContain("'22222222-2222-2222-2222-222222222222'::uuid");
	});
});
