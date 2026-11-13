import { describe, expect, it } from 'bun:test';
import {
	groupAvailabilityByDay,
	resolveMyAvailabilityPageGate,
	validateAvailabilityTimeRange,
} from '../../../src/lib/teachers/myAvailabilityHelpers';
import type { TeacherAvailability } from '../../../src/lib/teachers/teacherAvailabilityApi';

const baseSlot: Omit<TeacherAvailability, 'id' | 'day_of_week' | 'start_time' | 'end_time'> = {
	teacher_user_id: 't-1',
	room_id: null,
	created_at: '2026-01-01T00:00:00Z',
	updated_at: '2026-01-01T00:00:00Z',
	created_by: null,
	updated_by: null,
};

describe('resolveMyAvailabilityPageGate', () => {
	it('returns auth-loading while auth loads', () => {
		expect(resolveMyAvailabilityPageGate(true, true)).toBe('auth-loading');
	});

	it('returns denied for non-teachers', () => {
		expect(resolveMyAvailabilityPageGate(false, false)).toBe('denied');
	});

	it('returns ready for teachers', () => {
		expect(resolveMyAvailabilityPageGate(false, true)).toBe('ready');
	});
});

describe('validateAvailabilityTimeRange', () => {
	it('returns true when end time is after start time', () => {
		expect(validateAvailabilityTimeRange('09:00', '10:00')).toBe(true);
	});

	it('returns false when end time equals start time', () => {
		expect(validateAvailabilityTimeRange('09:00', '09:00')).toBe(false);
	});
});

describe('groupAvailabilityByDay', () => {
	it('groups slots by day of week', () => {
		const grouped = groupAvailabilityByDay([
			{ ...baseSlot, id: 'a', day_of_week: 1, start_time: '09:00', end_time: '10:00' },
			{ ...baseSlot, id: 'b', day_of_week: 1, start_time: '11:00', end_time: '12:00' },
			{ ...baseSlot, id: 'c', day_of_week: 2, start_time: '09:00', end_time: '10:00' },
		]);
		expect(grouped[1]).toHaveLength(2);
		expect(grouped[2]).toHaveLength(1);
	});
});
