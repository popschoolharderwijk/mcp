import { describe, expect, it } from 'bun:test';
import { buildStudentsSql } from './buildStudentsSqlHelpers';

describe('buildStudentsSql', () => {
	it('returns a comment when there are no rows', () => {
		expect(buildStudentsSql([])).toBe('-- No students to import\n');
	});

	it('includes auth users, identities, profiles, and students with date_of_birth', () => {
		const sql = buildStudentsSql([
			{
				mongoOid: 'oid-1',
				userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
				email: 'student@example.com',
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
		]);

		expect(sql).toContain('INSERT INTO auth.users');
		expect(sql).toContain('INSERT INTO auth.identities');
		expect(sql).toContain('UPDATE public.profiles');
		expect(sql).toContain('INSERT INTO public.students');
		expect(sql).toContain('date_of_birth');
		expect(sql).toContain("'2009-01-16'::date");
		expect(sql).toContain("'student@example.com'");
		expect(sql).toContain("'0621599555'");
		expect(sql).toContain("'Jesseweg'");
		expect(sql).toContain("'210'");
		expect(sql).toContain("'6939VK'");
		expect(sql).toContain("'Vaart'");
		expect(sql).toContain("'NL'");
		expect(sql).toContain('street_name = s.street_name');
		expect(sql).toContain('country_code = s.country_code');
		expect(sql).toContain("'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid");
		expect(sql).toContain('ON CONFLICT (user_id) DO UPDATE');
		expect(sql).not.toContain('INSERT INTO public.teachers');
	});
});
