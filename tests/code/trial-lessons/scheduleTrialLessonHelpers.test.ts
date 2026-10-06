import { describe, expect, it } from 'bun:test';
import {
	buildScheduleTrialLessonPayload,
	formatTrialLessonDateHeader,
	getScheduleTrialLessonDescription,
	getScheduleTrialLessonErrorMessage,
	getScheduleTrialLessonResetValues,
	getTeacherDisplayName,
	getTeacherInitials,
	groupFreeSlotsByDate,
	todayPlus,
} from '../../../src/lib/trial-lessons/scheduleTrialLessonHelpers';

describe('todayPlus', () => {
	it('returns iso date string', () => {
		expect(todayPlus(0)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});
});

describe('formatTrialLessonDateHeader', () => {
	it('includes weekday and month name', () => {
		expect(formatTrialLessonDateHeader('2026-09-07')).toContain('september');
	});
});

describe('getTeacherDisplayName', () => {
	it('returns full teacher name', () => {
		expect(getTeacherDisplayName({ firstName: 'Jan', lastName: 'Docent', avatarUrl: null })).toBe('Jan Docent');
	});

	it('returns fallback for missing teacher', () => {
		expect(getTeacherDisplayName(undefined)).toBe('Onbekende docent');
	});
});

describe('getTeacherInitials', () => {
	it('returns initials from teacher name', () => {
		expect(getTeacherInitials({ firstName: 'Jan', lastName: 'Docent', avatarUrl: null })).toBe('JD');
	});

	it('uses the last surname word for the second initial', () => {
		expect(getTeacherInitials({ firstName: 'Adam', lastName: 'van der Wal', avatarUrl: null })).toBe('AW');
	});
});

describe('buildScheduleTrialLessonPayload', () => {
	it('omits manual student fields when signup request exists', () => {
		expect(
			buildScheduleTrialLessonPayload({
				signupRequestId: 'req-1',
				lessonTypeId: 'lt-1',
				lessonTypeOptionId: null,
				teacherUserId: 'teacher-1',
				scheduledDate: '2026-09-07',
				scheduledStartTime: '09:00:00',
				durationMinutes: 30,
				notes: '',
				studentEmail: 'anna@example.com',
				studentFirstName: 'Anna',
				studentLastName: 'Bakker',
				hasSignupRequest: true,
			}),
		).toEqual({
			signup_request_id: 'req-1',
			teacher_user_id: 'teacher-1',
			lesson_type_id: 'lt-1',
			lesson_type_option_id: null,
			scheduled_date: '2026-09-07',
			scheduled_start_time: '09:00:00',
			duration_minutes: 30,
			notes: null,
			student_email: undefined,
			student_first_name: undefined,
			student_last_name: undefined,
		});
	});
});

describe('getScheduleTrialLessonErrorMessage', () => {
	it('prefers response error over invoke error', () => {
		expect(getScheduleTrialLessonErrorMessage({ error: 'Conflict' }, 'Network error')).toBe('Conflict');
	});
});

describe('getScheduleTrialLessonDescription', () => {
	it('includes student name for signup requests', () => {
		expect(getScheduleTrialLessonDescription(true, 'Anna', 'Bakker')).toBe(
			'Voor Anna Bakker — kies een vrij tijdslot.',
		);
	});
});

describe('getScheduleTrialLessonResetValues', () => {
	it('prefills student fields from signup request', () => {
		const values = getScheduleTrialLessonResetValues({
			email: 'anna@example.com',
			first_name: 'Anna',
			last_name: 'Bakker',
		});
		expect(values.studentEmail).toBe('anna@example.com');
		expect(values.studentFirstName).toBe('Anna');
		expect(values.studentLastName).toBe('Bakker');
		expect(values.notes).toBe('');
		expect(values.duration).toBe(30);
	});

	it('uses empty defaults when signup request is missing', () => {
		const values = getScheduleTrialLessonResetValues(null);
		expect(values.studentEmail).toBe('');
		expect(values.studentFirstName).toBe('');
		expect(values.studentLastName).toBe('');
		expect(values.fromDate).toBe(todayPlus(1));
		expect(values.toDate).toBe(todayPlus(30));
	});
});

describe('groupFreeSlotsByDate', () => {
	it('returns empty map when availability is empty', () => {
		expect(groupFreeSlotsByDate('2026-09-01', '2026-09-30', 30, new Map(), new Map(), new Map()).size).toBe(0);
	});
});
