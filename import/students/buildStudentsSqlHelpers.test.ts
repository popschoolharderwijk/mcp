import { describe, expect, it } from 'bun:test';
import { buildStudentsSql } from './buildStudentsSqlHelpers';

describe('buildStudentsSql', () => {
	it('returns a comment when there are no rows', () => {
		expect(buildStudentsSql([])).toBe('-- No students to import\n');
	});

	it('emits public.students upsert only and dedupes by user id', () => {
		const sql = buildStudentsSql([
			{
				mongoOid: 's1',
				userId: '11111111-1111-1111-1111-111111111111',
				email: 'a@example.com',
				emailWarning: null,
				firstName: 'A',
				lastName: 'B',
				phoneNumber: null,
				streetName: null,
				houseNumber: null,
				postalCode: null,
				city: null,
				countryCode: 'NL',
				dateOfBirth: '2010-01-01',
				invalidDateOfBirth: null,
				invalidCountryCode: null,
			},
			{
				mongoOid: 's2',
				userId: '11111111-1111-1111-1111-111111111111',
				email: 'a@example.com',
				emailWarning: null,
				firstName: 'A',
				lastName: 'B',
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
		]);
		expect(sql).toContain('INSERT INTO public.students');
		expect(sql).not.toContain('INSERT INTO auth.users');
		expect(sql).toContain('2010-01-01');
		expect(sql.split("'11111111-1111-1111-1111-111111111111'::uuid")).toHaveLength(2);
	});
});
