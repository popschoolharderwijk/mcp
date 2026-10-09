import { describe, expect, it } from 'bun:test';
import {
	buildTeachersMap,
	groupAgreementsByTeacher,
	groupAvailabilityByTeacher,
	groupTrialsByTeacher,
	mapTeacherIdsFromLessonTypes,
	mapTeacherIdsFromTeachers,
} from '../../../src/lib/trial-lessons/loadTrialLessonSchedulingDataHelpers';

describe('mapTeacherIdsFromLessonTypes', () => {
	it('maps teacher user ids', () => {
		expect(mapTeacherIdsFromLessonTypes([{ teacher_user_id: 't-1' }, { teacher_user_id: 't-2' }])).toEqual([
			't-1',
			't-2',
		]);
	});
});

describe('mapTeacherIdsFromTeachers', () => {
	it('maps teacher rows', () => {
		expect(mapTeacherIdsFromTeachers([{ user_id: 't-1' }])).toEqual(['t-1']);
	});
});

describe('buildTeachersMap', () => {
	it('maps profiles to teacher info', () => {
		const map = buildTeachersMap([{ user_id: 't-1', first_name: 'Jan', last_name: 'Docent', avatar_url: null }]);
		expect(map.get('t-1')).toEqual({
			user_id: 't-1',
			first_name: 'Jan',
			last_name: 'Docent',
			avatar_url: null,
		});
	});
});

describe('groupAvailabilityByTeacher', () => {
	it('groups slots per teacher', () => {
		const map = groupAvailabilityByTeacher([
			{ teacher_user_id: 't-1', day_of_week: 1, start_time: '09:00', end_time: '12:00' },
		]);
		expect(map.get('t-1')).toEqual([{ day_of_week: 1, start_time: '09:00', end_time: '12:00' }]);
	});
});

describe('groupAgreementsByTeacher', () => {
	it('includes agreements that end on or after from date', () => {
		const map = groupAgreementsByTeacher(
			[
				{
					teacher_user_id: 't-1',
					day_of_week: 2,
					start_time: '10:00',
					start_date: '2026-01-01',
					end_date: '2026-07-01',
					duration_minutes: 45,
					frequency: 'weekly',
				},
			],
			'2026-07-01',
		);
		expect(map.get('t-1')).toEqual([
			{
				day_of_week: 2,
				start_time: '10:00',
				start_date: '2026-01-01',
				end_date: '2026-07-01',
				duration_minutes: 45,
				frequency: 'weekly',
			},
		]);
	});

	it('skips agreements ended before from date', () => {
		const map = groupAgreementsByTeacher(
			[
				{
					teacher_user_id: 't-1',
					day_of_week: 1,
					start_time: '09:00',
					start_date: '2026-01-01',
					end_date: '2026-06-01',
					duration_minutes: 45,
					frequency: 'weekly',
				},
			],
			'2026-07-01',
		);
		expect(map.get('t-1')).toBeUndefined();
	});
});

describe('groupTrialsByTeacher', () => {
	it('groups scheduled trials per teacher', () => {
		const map = groupTrialsByTeacher([
			{
				teacher_user_id: 't-1',
				scheduled_date: '2026-09-07',
				scheduled_start_time: '14:00',
				duration_minutes: 30,
				status: 'scheduled',
			},
		]);
		expect(map.get('t-1')).toEqual([
			{
				teacher_user_id: 't-1',
				scheduled_date: '2026-09-07',
				scheduled_start_time: '14:00',
				duration_minutes: 30,
			},
		]);
	});

	it('skips cancelled trials', () => {
		const map = groupTrialsByTeacher([
			{
				teacher_user_id: 't-1',
				scheduled_date: '2026-09-07',
				scheduled_start_time: '14:00',
				duration_minutes: 30,
				status: 'cancelled',
			},
		]);
		expect(map.get('t-1')).toBeUndefined();
	});
});
