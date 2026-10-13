import { describe, expect, it } from 'bun:test';
import { buildTeacherLessonTypesSql, dedupeTeacherLessonTypeRows } from './buildTeacherLessonTypesSqlHelpers';
import type { TeacherLessonTypeSqlRow } from './types';

const rowA: TeacherLessonTypeSqlRow = {
	mongoOid: 't1:c1',
	teacherUserId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
	lessonTypeId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
};

const rowADup: TeacherLessonTypeSqlRow = {
	mongoOid: 't1:c1',
	teacherUserId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
	lessonTypeId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
};

const rowB: TeacherLessonTypeSqlRow = {
	mongoOid: 't1:c2',
	teacherUserId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
	lessonTypeId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
};

describe('dedupeTeacherLessonTypeRows', () => {
	it('keeps unique teacher+lesson-type pairs sorted stably', () => {
		expect(dedupeTeacherLessonTypeRows([rowB, rowA, rowADup])).toEqual([rowA, rowB]);
	});
});

describe('buildTeacherLessonTypesSql', () => {
	it('emits an idempotent teacher_lesson_types insert with notices', () => {
		const sql = buildTeacherLessonTypesSql([rowA, rowADup, rowB]);
		expect(sql).toContain('INSERT INTO public.teacher_lesson_types');
		expect(sql).toContain("'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid");
		expect(sql).toContain("'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid");
		expect(sql).toContain("'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid");
		expect(sql).toContain("RAISE NOTICE 'public.teacher_lesson_types:");
		expect(sql).toContain('WHERE NOT EXISTS');
	});

	it('returns a comment when there are no rows', () => {
		expect(buildTeacherLessonTypesSql([])).toBe('-- No teacher_lesson_types to import\n');
	});
});
