import { describe, expect, it } from 'bun:test';
import type { FreeSlotForTeacher } from '../../../src/lib/agreementSlots';
import {
	getTrialLessonSlotKey,
	isTrialLessonSlotSelected,
	mapTeacherInfoFromProfile,
} from '../../../src/lib/trial-lessons/scheduleTrialLessonSlotHelpers';

const slot: FreeSlotForTeacher = {
	date: '2026-09-07',
	day_of_week: 1,
	start_time: '09:00:00',
	end_time: '09:30:00',
	teacher_user_id: 'teacher-1',
};

describe('isTrialLessonSlotSelected', () => {
	it('returns true for matching slot', () => {
		expect(isTrialLessonSlotSelected(slot, slot)).toBe(true);
	});

	it('returns false when selected slot is null', () => {
		expect(isTrialLessonSlotSelected(null, slot)).toBe(false);
	});
});

describe('getTrialLessonSlotKey', () => {
	it('builds stable slot key', () => {
		expect(getTrialLessonSlotKey(slot)).toBe('2026-09-07-09:00:00-teacher-1');
	});
});

describe('mapTeacherInfoFromProfile', () => {
	it('maps profile fields to teacher info', () => {
		expect(
			mapTeacherInfoFromProfile({
				user_id: 'teacher-1',
				first_name: 'Jan',
				last_name: 'Docent',
				avatar_url: 'https://example.com/a.png',
			}),
		).toEqual({
			user_id: 'teacher-1',
			first_name: 'Jan',
			last_name: 'Docent',
			avatar_url: 'https://example.com/a.png',
		});
	});
});
