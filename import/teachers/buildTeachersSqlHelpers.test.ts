import { describe, expect, it } from 'bun:test';
import { buildTeachersSql } from './buildTeachersSqlHelpers';

describe('buildTeachersSql', () => {
	it('returns a comment when there are no rows', () => {
		expect(buildTeachersSql([])).toBe('-- No teachers to import\n');
	});

	it('includes auth users, identities, profiles, teachers, and lesson type links', () => {
		const sql = buildTeachersSql([
			{
				mongoOid: 'oid-1',
				userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
				email: 'teacher@example.com',
				firstName: 'Femke',
				lastName: 'Bosman',
				phoneNumber: '0694350865',
				bio: 'Hello',
				lessonTypeNames: ['Zangles'],
				unmatchedInstruments: [],
			},
		]);

		expect(sql).toContain('INSERT INTO auth.users');
		expect(sql).toContain('INSERT INTO auth.identities');
		expect(sql).toContain('UPDATE public.profiles');
		expect(sql).toContain('INSERT INTO public.teachers');
		expect(sql).toContain('INSERT INTO public.teacher_lesson_types');
		expect(sql).toContain("'Zangles'");
		expect(sql).toContain("'teacher@example.com'");
		expect(sql).toContain("'0694350865'");
		expect(sql).toContain("'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid");
		expect(sql).toContain('ON CONFLICT (user_id) DO UPDATE');
	});
});
