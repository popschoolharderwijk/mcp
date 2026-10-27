import { describe, expect, it } from 'bun:test';
import {
	buildAgreementColumns,
	resolveOmittedAgreementPersonColumns,
} from '../../../src/lib/agreements/agreementsTableColumns';

describe('buildAgreementColumns', () => {
	it('returns all columns when nothing is omitted', () => {
		expect(buildAgreementColumns().map((column) => column.key)).toEqual([
			'student',
			'teacher',
			'lesson_type',
			'lesson',
			'duration_minutes',
			'start_date',
			'end_date',
			'created_at',
		]);
	});

	it('omits the student column for a student-scoped table', () => {
		expect(
			buildAgreementColumns(resolveOmittedAgreementPersonColumns({ studentUserId: 's-1' })).map(
				(column) => column.key,
			),
		).toEqual(['teacher', 'lesson_type', 'lesson', 'duration_minutes', 'start_date', 'end_date', 'created_at']);
	});

	it('omits the teacher column for a teacher-scoped table', () => {
		expect(
			buildAgreementColumns(resolveOmittedAgreementPersonColumns({ teacherUserId: 't-1' })).map(
				(column) => column.key,
			),
		).toEqual(['student', 'lesson_type', 'lesson', 'duration_minutes', 'start_date', 'end_date', 'created_at']);
	});
});
