import { describe, expect, it } from 'bun:test';
import { DEFAULT_START_TIME } from '../../../src/lib/availability';
import {
	applyAvailabilityBlockMove,
	applyAvailabilityBlockResize,
	availabilityBlockDisplayTimes,
	availabilityBlockTimesChanged,
	availabilityIncludesUnassignedRoom,
	availabilityPercentDeltaToMinutes,
	availabilityPointerYToMinutes,
	availabilityRangesTouchOrOverlap,
	buildAvailabilityBlocks,
	buildAvailabilityCreateRangeFromMinutes,
	buildAvailabilitySlotFormFromClick,
	canStartAvailabilityBlockPointer,
	computeAvailabilityBlockPointerPreview,
	didAvailabilityBlockDrag,
	findAvailabilityBlockCoveringTime,
	generateAvailabilityTimeSlots,
	getAvailabilityBlocksForDay,
	getAvailabilityDialogDescription,
	getAvailabilityDialogDescriptionText,
	getAvailabilityDialogTitle,
	getAvailabilityEndTimeOptions,
	isAvailabilityTimeRangeValid,
	mergeAvailabilityTimeForms,
	planAvailabilitySlotWrite,
	resolveAvailabilityBlockPointerTimes,
	resolveAvailabilityCreatePointerEndAction,
	resolveAvailabilityPointerEndAction,
	roomsUsedInAvailability,
	shouldShowAvailabilityBlockTimes,
} from '../../../src/lib/teachers/teacherAvailabilitySectionHelpers';

const agenda = { start_hour: 8, end_hour: 18, slot_minutes: 30 };

describe('generateAvailabilityTimeSlots', () => {
	it('starts at the configured start hour', () => {
		expect(generateAvailabilityTimeSlots()[0]).toBe(DEFAULT_START_TIME);
	});

	it('uses agenda start hour and slot length from settings', () => {
		const slots = generateAvailabilityTimeSlots({ start_hour: 9, end_hour: 11, slot_minutes: 60 });
		expect(slots).toEqual(['09:00', '10:00', '11:00']);
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
				room_id: null,
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
				room_id: null,
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
				room_id: null,
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
			room_id: null,
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

describe('availabilityBlockDisplayTimes', () => {
	it('uses block times when preview is null', () => {
		expect(availabilityBlockDisplayTimes(null, { startTime: '09:00:00', endTime: '10:00:00' })).toEqual({
			start: '09:00:00',
			end: '10:00:00',
		});
	});

	it('uses preview times when present', () => {
		expect(
			availabilityBlockDisplayTimes(
				{ start_time: '09:30', end_time: '10:30', room_id: null },
				{ startTime: '09:00:00', endTime: '10:00:00' },
			),
		).toEqual({ start: '09:30', end: '10:30' });
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
				room_id: null,
				created_at: '2026-01-01T00:00:00Z',
				updated_at: '2026-01-01T00:00:00Z',
				created_by: null,
				updated_by: null,
			},
		]);
		expect(findAvailabilityBlockCoveringTime(blocks, '09:00:00')?.id).toBe('slot-1');
	});
});

describe('availabilityPointerYToMinutes', () => {
	it('maps the top and bottom of a column to agenda bounds', () => {
		expect(
			availabilityPointerYToMinutes({
				clientY: 100,
				columnTop: 100,
				columnHeight: 200,
				agenda,
			}),
		).toBe(8 * 60);
		expect(
			availabilityPointerYToMinutes({
				clientY: 300,
				columnTop: 100,
				columnHeight: 200,
				agenda,
			}),
		).toBe(18 * 60);
	});
});

describe('buildAvailabilityCreateRangeFromMinutes', () => {
	it('creates a single slot when origin and current are in the same slot', () => {
		expect(
			buildAvailabilityCreateRangeFromMinutes({
				originMinutes: 9 * 60 + 10,
				currentMinutes: 9 * 60 + 20,
				agenda,
			}),
		).toEqual({ start_time: '09:00', end_time: '09:30', room_id: null });
	});

	it('creates a range spanning dragged slots in either direction', () => {
		expect(
			buildAvailabilityCreateRangeFromMinutes({
				originMinutes: 9 * 60,
				currentMinutes: 10 * 60 + 10,
				agenda,
			}),
		).toEqual({ start_time: '09:00', end_time: '10:30', room_id: null });
		expect(
			buildAvailabilityCreateRangeFromMinutes({
				originMinutes: 10 * 60 + 10,
				currentMinutes: 9 * 60,
				agenda,
			}),
		).toEqual({ start_time: '09:00', end_time: '10:30', room_id: null });
	});
});

describe('availabilityPercentDeltaToMinutes', () => {
	it('snaps percent movement to slot minutes', () => {
		expect(availabilityPercentDeltaToMinutes(5, agenda)).toBe(30);
		expect(availabilityPercentDeltaToMinutes(2, agenda)).toBe(0);
	});
});

describe('applyAvailabilityBlockMove', () => {
	it('moves a block within the day while keeping duration', () => {
		expect(
			applyAvailabilityBlockMove({
				startTime: '09:00',
				endTime: '10:00',
				deltaMinutes: 30,
				agenda,
			}),
		).toEqual({ start_time: '09:30', end_time: '10:30', room_id: null });
	});

	it('clamps a moved block to the agenda window', () => {
		expect(
			applyAvailabilityBlockMove({
				startTime: '09:00',
				endTime: '10:00',
				deltaMinutes: 600,
				agenda,
			}),
		).toEqual({ start_time: '17:00', end_time: '18:00', room_id: null });
	});
});

describe('applyAvailabilityBlockResize', () => {
	it('resizes the start edge with a minimum slot duration', () => {
		expect(
			applyAvailabilityBlockResize({
				startTime: '09:00',
				endTime: '11:00',
				edge: 'start',
				deltaMinutes: 60,
				agenda,
			}),
		).toEqual({ start_time: '10:00', end_time: '11:00', room_id: null });
	});

	it('resizes the end edge within the agenda window', () => {
		expect(
			applyAvailabilityBlockResize({
				startTime: '09:00',
				endTime: '10:00',
				edge: 'end',
				deltaMinutes: 30,
				agenda,
			}),
		).toEqual({ start_time: '09:00', end_time: '10:30', room_id: null });
	});
});

describe('resolveAvailabilityBlockPointerTimes', () => {
	it('routes move and resize modes', () => {
		expect(
			resolveAvailabilityBlockPointerTimes({
				mode: 'move',
				startTime: '09:00',
				endTime: '10:00',
				deltaMinutes: 30,
				agenda,
			}),
		).toEqual({ start_time: '09:30', end_time: '10:30', room_id: null });
		expect(
			resolveAvailabilityBlockPointerTimes({
				mode: 'resize-end',
				startTime: '09:00',
				endTime: '10:00',
				deltaMinutes: 30,
				agenda,
			}),
		).toEqual({ start_time: '09:00', end_time: '10:30', room_id: null });
	});
});

describe('didAvailabilityBlockDrag', () => {
	it('requires a minimum pointer movement before treating as drag', () => {
		expect(didAvailabilityBlockDrag(3)).toBe(false);
		expect(didAvailabilityBlockDrag(4)).toBe(true);
	});
});

describe('resolveAvailabilityPointerEndAction', () => {
	it('returns click when movement stays under the drag threshold', () => {
		expect(
			resolveAvailabilityPointerEndAction({
				deltaYPx: 2,
				preview: { start_time: '09:30', end_time: '10:30', room_id: null },
				original: { startTime: '09:00', endTime: '10:00' },
			}),
		).toEqual({ kind: 'click' });
	});

	it('returns commit when drag changes times', () => {
		expect(
			resolveAvailabilityPointerEndAction({
				deltaYPx: 20,
				preview: { start_time: '09:30', end_time: '10:30', room_id: null },
				original: { startTime: '09:00', endTime: '10:00' },
			}),
		).toEqual({ kind: 'commit', form: { start_time: '09:30', end_time: '10:30', room_id: null } });
	});

	it('returns noop when drag leaves times unchanged', () => {
		expect(
			resolveAvailabilityPointerEndAction({
				deltaYPx: 20,
				preview: { start_time: '09:00', end_time: '10:00', room_id: null },
				original: { startTime: '09:00:00', endTime: '10:00:00' },
			}),
		).toEqual({ kind: 'noop' });
	});
});

describe('resolveAvailabilityCreatePointerEndAction', () => {
	it('returns click, commit, or noop based on drag and preview', () => {
		expect(
			resolveAvailabilityCreatePointerEndAction({
				deltaYPx: 1,
				preview: { start_time: '09:00', end_time: '10:00', room_id: null },
			}),
		).toEqual({ kind: 'click' });
		expect(
			resolveAvailabilityCreatePointerEndAction({
				deltaYPx: 20,
				preview: { start_time: '09:00', end_time: '10:00', room_id: null },
			}),
		).toEqual({ kind: 'commit', form: { start_time: '09:00', end_time: '10:00', room_id: null } });
		expect(resolveAvailabilityCreatePointerEndAction({ deltaYPx: 20, preview: null })).toEqual({
			kind: 'noop',
		});
	});
});

describe('computeAvailabilityBlockPointerPreview', () => {
	it('returns null for a zero-height column', () => {
		expect(
			computeAvailabilityBlockPointerPreview({
				mode: 'move',
				originStartTime: '09:00',
				originEndTime: '10:00',
				startClientY: 0,
				currentClientY: 40,
				columnHeight: 0,
				agenda,
			}),
		).toBeNull();
	});

	it('moves the block when pointer travels far enough', () => {
		expect(
			computeAvailabilityBlockPointerPreview({
				mode: 'move',
				originStartTime: '09:00',
				originEndTime: '10:00',
				startClientY: 0,
				currentClientY: 30,
				columnHeight: 600,
				agenda,
			}),
		).toEqual({ start_time: '09:30', end_time: '10:30', room_id: null });
	});
});

describe('canStartAvailabilityBlockPointer', () => {
	it('allows editing only when not pending a save', () => {
		expect(canStartAvailabilityBlockPointer(true, false)).toBe(true);
		expect(canStartAvailabilityBlockPointer(true, true)).toBe(false);
		expect(canStartAvailabilityBlockPointer(false, false)).toBe(false);
	});
});

describe('availabilityBlockTimesChanged', () => {
	it('detects changed start or end times', () => {
		expect(
			availabilityBlockTimesChanged(
				{ startTime: '09:00:00', endTime: '10:00:00' },
				{ start_time: '09:00', end_time: '10:00', room_id: null },
			),
		).toBe(false);
		expect(
			availabilityBlockTimesChanged(
				{ startTime: '09:00:00', endTime: '10:00:00' },
				{ start_time: '09:30', end_time: '10:00', room_id: null },
			),
		).toBe(true);
	});
});

describe('availabilityRangesTouchOrOverlap', () => {
	it('detects overlap and adjacent touching ranges', () => {
		expect(availabilityRangesTouchOrOverlap('09:00', '10:00', '09:30', '11:00')).toBe(true);
		expect(availabilityRangesTouchOrOverlap('09:00', '10:00', '10:00', '11:00')).toBe(true);
		expect(availabilityRangesTouchOrOverlap('09:00', '10:00', '10:30', '11:00')).toBe(false);
	});
});

describe('mergeAvailabilityTimeForms', () => {
	it('returns the union of start and end times', () => {
		expect(
			mergeAvailabilityTimeForms([
				{ start_time: '09:00', end_time: '10:00', room_id: null },
				{ start_time: '09:30', end_time: '11:00', room_id: null },
			]),
		).toEqual({ start_time: '09:00', end_time: '11:00', room_id: null });
	});
});

describe('planAvailabilitySlotWrite', () => {
	const dayBlocks = [
		{ id: 'a', startTime: '09:00', endTime: '09:30', roomId: null },
		{ id: 'b', startTime: '11:00', endTime: '12:00', roomId: null },
	];

	it('inserts when the new range does not touch existing blocks', () => {
		expect(
			planAvailabilitySlotWrite({
				dayBlocks,
				form: { start_time: '10:00', end_time: '10:30', room_id: null },
			}),
		).toEqual({
			kind: 'insert',
			form: { start_time: '10:00', end_time: '10:30', room_id: null },
		});
	});

	it('merges an insert into the earliest overlapping block', () => {
		expect(
			planAvailabilitySlotWrite({
				dayBlocks,
				form: { start_time: '09:15', end_time: '11:30', room_id: null },
			}),
		).toEqual({
			kind: 'update',
			keepId: 'a',
			form: { start_time: '09:00', end_time: '12:00', room_id: null },
			deleteIds: ['b'],
		});
	});

	it('merges a moved block with overlapping neighbors', () => {
		expect(
			planAvailabilitySlotWrite({
				dayBlocks,
				form: { start_time: '09:15', end_time: '11:30', room_id: null },
				movingBlockId: 'a',
			}),
		).toEqual({
			kind: 'update',
			keepId: 'a',
			form: { start_time: '09:15', end_time: '12:00', room_id: null },
			deleteIds: ['b'],
		});
	});

	it('does not merge overlapping blocks that use different rooms', () => {
		expect(
			planAvailabilitySlotWrite({
				dayBlocks: [
					{ id: 'a', startTime: '09:00', endTime: '10:00', roomId: 'room-blue' },
					{ id: 'b', startTime: '10:00', endTime: '11:00', roomId: 'room-pink' },
				],
				form: { start_time: '09:30', end_time: '10:30', room_id: 'room-blue' },
			}),
		).toEqual({
			kind: 'update',
			keepId: 'a',
			form: { start_time: '09:00', end_time: '10:30', room_id: 'room-blue' },
			deleteIds: [],
		});
	});

	it('merges overlapping blocks that share the same room', () => {
		expect(
			planAvailabilitySlotWrite({
				dayBlocks: [
					{ id: 'a', startTime: '09:00', endTime: '10:00', roomId: 'room-blue' },
					{ id: 'b', startTime: '10:00', endTime: '11:00', roomId: 'room-blue' },
				],
				form: { start_time: '09:30', end_time: '10:30', room_id: 'room-blue' },
			}),
		).toEqual({
			kind: 'update',
			keepId: 'a',
			form: { start_time: '09:00', end_time: '11:00', room_id: 'room-blue' },
			deleteIds: ['b'],
		});
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
				roomId: null,
				roomName: null,
				roomColor: null,
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

const legendRooms = [
	{ id: 'studio', name: 'Studio', color: '#ff9500' },
	{ id: 'drum', name: 'Drumlokaal', color: '#ffdd00' },
	{ id: 'oefen', name: 'Oefenruimte', color: '#f5ffc2' },
];

describe('roomsUsedInAvailability', () => {
	it('keeps only rooms that a block uses, in the room list order', () => {
		expect(
			roomsUsedInAvailability(legendRooms, [{ roomId: 'oefen' }, { roomId: 'studio' }, { roomId: 'oefen' }]),
		).toEqual([legendRooms[0], legendRooms[2]]);
	});

	it('returns no rooms when every block has no room', () => {
		expect(roomsUsedInAvailability(legendRooms, [{ roomId: null }])).toEqual([]);
	});
});

describe('availabilityIncludesUnassignedRoom', () => {
	it('is true when a block has no room', () => {
		expect(availabilityIncludesUnassignedRoom([{ roomId: 'studio' }, { roomId: null }])).toBe(true);
	});

	it('is false when every block has a room', () => {
		expect(availabilityIncludesUnassignedRoom([{ roomId: 'studio' }])).toBe(false);
	});

	it('is false when there are no blocks', () => {
		expect(availabilityIncludesUnassignedRoom([])).toBe(false);
	});
});
