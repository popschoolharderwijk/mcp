import { describe, expect, it } from 'bun:test';
import {
	filterTeacherAvailability,
	findTeacherForAvailabilitySlot,
	groupAvailabilityByDay,
	shouldShowTeacherNameOnAvailabilitySlot,
} from '../../../src/lib/teachers/teacherAvailabilityPageHelpers';

const availability = [
	{
		id: 'slot-1',
		teacher_user_id: 'teacher-1',
		day_of_week: 1,
		start_time: '09:00:00',
		end_time: '12:00:00',
		room_id: null,
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z',
		created_by: null,
		updated_by: null,
	},
	{
		id: 'slot-2',
		teacher_user_id: 'teacher-2',
		day_of_week: 1,
		start_time: '13:00:00',
		end_time: '15:00:00',
		room_id: null,
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z',
		created_by: null,
		updated_by: null,
	},
];

describe('filterTeacherAvailability', () => {
	it('returns all availability when all teachers are selected', () => {
		expect(filterTeacherAvailability(availability, 'all')).toEqual(availability);
	});

	it('returns only slots for the selected teacher', () => {
		expect(filterTeacherAvailability(availability, 'teacher-1')).toEqual([availability[0]]);
	});
});

describe('groupAvailabilityByDay', () => {
	it('groups availability slots by day of week', () => {
		expect(groupAvailabilityByDay(availability)).toEqual({
			1: availability,
		});
	});
});

describe('shouldShowTeacherNameOnAvailabilitySlot', () => {
	it('returns true when all teachers are selected', () => {
		expect(shouldShowTeacherNameOnAvailabilitySlot('all')).toBe(true);
	});

	it('returns false when a single teacher is selected', () => {
		expect(shouldShowTeacherNameOnAvailabilitySlot('teacher-1')).toBe(false);
	});
});

describe('findTeacherForAvailabilitySlot', () => {
	it('returns the matching teacher', () => {
		expect(
			findTeacherForAvailabilitySlot(
				[
					{
						user_id: 'teacher-1',
						profile: { first_name: 'Piet', last_name: 'Docent', email: 'piet@example.com' },
					},
				],
				'teacher-1',
			),
		).toEqual({
			user_id: 'teacher-1',
			profile: { first_name: 'Piet', last_name: 'Docent', email: 'piet@example.com' },
		});
	});
});
