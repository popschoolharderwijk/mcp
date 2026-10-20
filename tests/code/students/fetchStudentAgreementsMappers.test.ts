import { describe, expect, it } from 'bun:test';
import { type AgreementRow, mapAgreementRow } from '../../../src/lib/students/fetchStudentAgreementsMappers';

const baseRow: AgreementRow = {
	id: 'agr-1',
	day_of_week: 1,
	start_time: '14:00:00',
	start_date: '2026-09-01',
	end_date: null,
	is_active: true,
	notes: 'Focus op techniek',
	duration_minutes: 45,
	frequency: 'weekly',
	teacher_user_id: 'teacher-1',
	lesson_type_id: 'lesson-type-1',
};

describe('mapAgreementRow', () => {
	it('maps teacher and lesson type relations when both are present', () => {
		const teacherById = new Map([
			['teacher-1', { first_name: 'Jan', last_name: 'Jansen', avatar_url: 'https://example.com/jan.png' }],
		]);
		const lessonTypeById = new Map([
			['lesson-type-1', { id: 'lesson-type-1', name: 'Piano', icon: 'piano', color: '#ff0000' }],
		]);

		expect(mapAgreementRow(baseRow, teacherById, lessonTypeById)).toEqual({
			id: 'agr-1',
			day_of_week: 1,
			start_time: '14:00:00',
			start_date: '2026-09-01',
			end_date: null,
			is_active: true,
			notes: 'Focus op techniek',
			duration_minutes: 45,
			frequency: 'weekly',
			teacher: {
				first_name: 'Jan',
				last_name: 'Jansen',
				avatar_url: 'https://example.com/jan.png',
			},
			lesson_type: {
				id: 'lesson-type-1',
				name: 'Piano',
				icon: 'piano',
				color: '#ff0000',
			},
		});
	});

	it('falls back to null teacher fields when the teacher profile is missing', () => {
		const lessonTypeById = new Map([
			['lesson-type-1', { id: 'lesson-type-1', name: 'Piano', icon: null, color: null }],
		]);

		expect(mapAgreementRow(baseRow, new Map(), lessonTypeById).teacher).toEqual({
			first_name: null,
			last_name: null,
			avatar_url: null,
		});
	});

	it('falls back to row lesson type id and empty name when lesson type is missing', () => {
		const teacherById = new Map([['teacher-1', { first_name: 'Jan', last_name: 'Jansen', avatar_url: null }]]);

		expect(mapAgreementRow(baseRow, teacherById, new Map()).lesson_type).toEqual({
			id: 'lesson-type-1',
			name: '',
			icon: '',
			color: '',
		});
	});
});
