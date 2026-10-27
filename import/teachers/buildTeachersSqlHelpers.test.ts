import { describe, expect, it } from 'bun:test';
import { buildTeachersSql } from './buildTeachersSqlHelpers';

describe('buildTeachersSql', () => {
	it('emits public.teachers upsert only and dedupes by user id', () => {
		const sql = buildTeachersSql([
			{
				mongoOid: 't1',
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
				cocIssuedOn: '2023-01-01',
				invalidCocIssuedOn: null,
				invalidCountryCode: null,
			},
			{
				mongoOid: 't2',
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
				cocIssuedOn: null,
				invalidCocIssuedOn: null,
				invalidCountryCode: null,
			},
		]);
		expect(sql).toContain('INSERT INTO public.teachers');
		expect(sql).not.toContain('INSERT INTO auth.users');
		expect(sql).toContain('2023-01-01');
		expect(sql.split("'11111111-1111-1111-1111-111111111111'::uuid")).toHaveLength(2);
	});
});
