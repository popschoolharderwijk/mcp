import { describe, expect, it } from 'bun:test';
import { assembleCommandPaletteSearchResults } from '../../../src/lib/layout/commandPaletteSearchHelpers';

const person = {
	user_id: 'u-1',
	first_name: 'Anna',
	last_name: 'Bakker',
	email: 'anna@example.com',
	avatar_url: null,
	phone_number: null,
};

describe('assembleCommandPaletteSearchResults', () => {
	const dualPerson = { ...person, user_id: 'dual' };
	const plainUser = { ...person, user_id: 'user-only', email: 'user@example.com' };
	const teacherAlsoUser = { ...person, user_id: 'teacher-1', email: 't@example.com' };

	it('shows dual-role people in both groups with badges and drops member users', () => {
		const results = assembleCommandPaletteSearchResults(
			{
				students: [dualPerson],
				teachers: [dualPerson],
				users: [dualPerson, plainUser, teacherAlsoUser],
			},
			{
				studentIds: new Set(['dual']),
				teacherIds: new Set(['dual', 'teacher-1']),
			},
		);

		expect(results.students).toEqual([
			{
				kind: 'student',
				person: dualPerson,
				otherRoleLabel: 'Docent',
				href: '/students/dual',
			},
		]);
		expect(results.teachers).toEqual([
			{
				kind: 'teacher',
				person: dualPerson,
				otherRoleLabel: 'Leerling',
				href: '/teachers/dual',
			},
		]);
		expect(results.users).toEqual([
			{
				kind: 'user',
				person: plainUser,
				otherRoleLabel: null,
				href: '/users/user-only/profile',
			},
		]);
	});
});
