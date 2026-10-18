import { describe, expect, it } from 'bun:test';
import { DEFAULT_START_TIME } from '../../../src/lib/availability';
import {
	buildAvailabilityBlocks,
	buildAvailabilitySlotFormFromClick,
	findAvailabilityBlockCoveringTime,
	generateAvailabilityTimeSlots,
	getAvailabilityBlocksForDay,
	getAvailabilityDialogDescription,
	getAvailabilityDialogDescriptionText,
	getAvailabilityDialogTitle,
	getAvailabilityEndTimeOptions,
	getTeacherAvailabilityCardDescription,
	isAvailabilityTimeRangeValid,
	shouldShowAvailabilityBlockTimes,
} from '../../../src/lib/teachers/teacherAvailabilitySectionHelpers';

describe('generateAvailabilityTimeSlots', () => {
	it('starts at the configured start hour', () => {
		expect(generateAvailabilityTimeSlots()[0]).toBe(DEFAULT_START_TIME);
	});
});

describe('buildAvailabilityBlocks', () => {
	it('maps database availability to display blocks', () => {
		const blocks = buildAvailabilityBlocks([
			{
				id: 'slot-1',
				teacher_user_id: 'teacher-1',
				day_of_week: 1,
				start_time: '09:00:00',
				end_time: '10:00:00',
				created_at: '2026-01-01T00:00:00Z',
				updated_at: '2026-01-01T00:00:00Z',
				created_by: null,
				updated_by: null,
			},
		]);
		expect(blocks).toHaveLength(1);
		expect(blocks[0]?.displayDay).toBe(0);
		expect(blocks[0]?.startTime).toBe('09:00:00');
	});
});

describe('getAvailabilityBlocksForDay', () => {
	it('returns only blocks for the requested day', () => {
		const blocks = buildAvailabilityBlocks([
			{
				id: 'slot-1',
				teacher_user_id: 'teacher-1',
				day_of_week: 1,
				start_time: '09:00:00',
				end_time: '10:00:00',
				created_at: '2026-01-01T00:00:00Z',
				updated_at: '2026-01-01T00:00:00Z',
				created_by: null,
				updated_by: null,
			},
			{
				id: 'slot-2',
				teacher_user_id: 'teacher-1',
				day_of_week: 2,
				start_time: '09:00:00',
				end_time: '10:00:00',
				created_at: '2026-01-01T00:00:00Z',
				updated_at: '2026-01-01T00:00:00Z',
				created_by: null,
				updated_by: null,
			},
		]);
		expect(getAvailabilityBlocksForDay(blocks, 0)).toHaveLength(1);
		expect(getAvailabilityBlocksForDay(blocks, 0)[0]?.id).toBe('slot-1');
	});
});

describe('buildAvailabilitySlotFormFromClick', () => {
	it('builds a default one hour slot from a clicked time', () => {
		const slots = ['09:00', '09:30', '10:00', '10:30', '11:00'];
		expect(buildAvailabilitySlotFormFromClick('09:00', slots)).toEqual({
			start_time: '09:00',
			end_time: '10:00',
		});
	});
});

describe('shouldShowAvailabilityBlockTimes', () => {
	it('returns false for 30 minute blocks', () => {
		expect(shouldShowAvailabilityBlockTimes('09:00', '09:30')).toBe(false);
	});

	it('returns true for longer blocks', () => {
		expect(shouldShowAvailabilityBlockTimes('09:00', '10:00')).toBe(true);
	});
});

describe('isAvailabilityTimeRangeValid', () => {
	it('returns true when end time is after start time', () => {
		expect(isAvailabilityTimeRangeValid('09:00', '10:00')).toBe(true);
	});

	it('returns false when end time equals start time', () => {
		expect(isAvailabilityTimeRangeValid('09:00', '09:00')).toBe(false);
	});
});

describe('findAvailabilityBlockCoveringTime', () => {
	it('returns the block that covers the clicked time', () => {
		const blocks = buildAvailabilityBlocks([
			{
				id: 'slot-1',
				teacher_user_id: 'teacher-1',
				day_of_week: 1,
				start_time: '09:00:00',
				end_time: '10:00:00',
				created_at: '2026-01-01T00:00:00Z',
				updated_at: '2026-01-01T00:00:00Z',
				created_by: null,
				updated_by: null,
			},
		]);
		expect(findAvailabilityBlockCoveringTime(blocks, '09:00:00')?.id).toBe('slot-1');
	});
});

describe('getTeacherAvailabilityCardDescription', () => {
	it('returns the edit description when editing is allowed', () => {
		expect(getTeacherAvailabilityCardDescription(true)).toBe(
			'Klik op lege cel om toe te voegen, op tijdslot om te wijzigen',
		);
	});

	it('returns the read-only description when editing is not allowed', () => {
		expect(getTeacherAvailabilityCardDescription(false)).toBe('Beschikbare tijdsloten');
	});
});

describe('getAvailabilityDialogTitle', () => {
	it('returns the edit title when a block is being edited', () => {
		expect(
			getAvailabilityDialogTitle({
				id: 'slot-1',
				displayDay: 0,
				startTime: '09:00',
				endTime: '10:00',
				topPercent: 0,
				heightPercent: 10,
			}),
		).toBe('Tijdslot wijzigen');
	});

	it('returns the add title when no block is being edited', () => {
		expect(getAvailabilityDialogTitle(null)).toBe('Nieuw tijdslot toevoegen');
	});
});

describe('getAvailabilityDialogDescription', () => {
	const dayNames = ['Maandag', 'Dinsdag'];

	it('returns null when no slot is selected', () => {
		expect(getAvailabilityDialogDescription(null, null, dayNames)).toBeNull();
	});

	it('returns edit mode details for an existing block', () => {
		expect(
			getAvailabilityDialogDescription({ day: 0, time: '09:00' }, { id: 'slot-1' } as never, dayNames),
		).toEqual({
			mode: 'edit',
			dayName: 'Maandag',
		});
	});

	it('returns add mode details for a new slot', () => {
		expect(getAvailabilityDialogDescription({ day: 1, time: '09:00' }, null, dayNames)).toEqual({
			mode: 'add',
			dayName: 'Dinsdag',
			startTime: '09:00',
		});
	});
});

describe('getAvailabilityEndTimeOptions', () => {
	it('returns only end times after the selected start time', () => {
		expect(getAvailabilityEndTimeOptions('09:00', ['09:00', '09:30', '10:00'])).toEqual(['09:30', '10:00']);
	});
});

describe('getAvailabilityDialogDescriptionText', () => {
	it('returns edit text for an existing block', () => {
		expect(getAvailabilityDialogDescriptionText({ mode: 'edit', dayName: 'Maandag' })).toEqual({
			prefix: 'Wijzig beschikbaarheid voor',
			dayName: 'Maandag',
		});
	});

	it('returns add text for a new slot', () => {
		expect(getAvailabilityDialogDescriptionText({ mode: 'add', dayName: 'Dinsdag', startTime: '09:00' })).toEqual({
			prefix: 'Voeg beschikbaarheid toe voor',
			dayName: 'Dinsdag',
			startTime: '09:00',
		});
	});
});
