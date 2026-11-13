import type { Tables } from '@/integrations/supabase/types';
import {
	availabilityConfigFromAgenda,
	availabilityDefaultEndTime,
	availabilityDefaultStartTime,
} from '@/lib/availability';
import { APP_SETTINGS_BOOTSTRAP } from '@/lib/settings/appSettingsDefaults';
import type { AgendaSetting } from '@/lib/settings/appSettingsTypes';
import { formatTime, hasTimeChange } from '@/lib/time/time-format';
import { timeToMinutes } from '@/lib/time/time-range';

export interface AvailabilityRoomRef {
	id: string;
	name: string;
	color: string;
}

export interface AvailabilityBlock {
	id: string;
	displayDay: number;
	startTime: string;
	endTime: string;
	topPercent: number;
	heightPercent: number;
	roomId: string | null;
	roomName: string | null;
	roomColor: string | null;
}

export interface AvailabilityTimeForm {
	start_time: string;
	end_time: string;
	room_id: string | null;
}

export type AvailabilityBlockPointerMode = 'move' | 'resize-start' | 'resize-end';

const AVAILABILITY_BLOCK_DRAG_THRESHOLD_PX = 4;

export function defaultAvailabilityTimeForm(
	agenda: AgendaSetting = APP_SETTINGS_BOOTSTRAP.agenda,
): AvailabilityTimeForm {
	return {
		start_time: availabilityDefaultStartTime(agenda),
		end_time: availabilityDefaultEndTime(agenda),
		room_id: null,
	};
}

export function generateAvailabilityTimeSlots(agenda: AgendaSetting = APP_SETTINGS_BOOTSTRAP.agenda): string[] {
	const config = availabilityConfigFromAgenda(agenda);
	const slots: string[] = [];
	const totalMinutes = (config.END_HOUR - config.START_HOUR) * 60;
	const slotCount = Math.floor(totalMinutes / config.SLOT_DURATION_MINUTES);
	for (let i = 0; i <= slotCount; i++) {
		const totalMinutesFromStart = i * config.SLOT_DURATION_MINUTES;
		const hour = config.START_HOUR + Math.floor(totalMinutesFromStart / 60);
		const minute = totalMinutesFromStart % 60;
		slots.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
	}
	return slots;
}

export function buildAvailabilityHourLabels(agenda: AgendaSetting = APP_SETTINGS_BOOTSTRAP.agenda): number[] {
	const config = availabilityConfigFromAgenda(agenda);
	return Array.from({ length: config.END_HOUR - config.START_HOUR + 1 }, (_, index) => config.START_HOUR + index);
}

function minutesToHHmm(totalMinutes: number): string {
	const hour = Math.floor(totalMinutes / 60);
	const minute = totalMinutes % 60;
	return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function snapMinutesToSlot(totalMinutes: number, slotMinutes: number): number {
	return Math.round(totalMinutes / slotMinutes) * slotMinutes;
}

export function availabilityGeometryFromTimes(
	startTime: string,
	endTime: string,
	agenda: AgendaSetting = APP_SETTINGS_BOOTSTRAP.agenda,
): { topPercent: number; heightPercent: number } {
	const config = availabilityConfigFromAgenda(agenda);
	const totalMinutes = (config.END_HOUR - config.START_HOUR) * 60;
	const start = timeToMinutes(formatTime(startTime));
	const end = timeToMinutes(formatTime(endTime));
	if (start === null || end === null || totalMinutes <= 0) {
		return { topPercent: 0, heightPercent: 0 };
	}

	const startMinutes = start - config.START_HOUR * 60;
	const endMinutes = end - config.START_HOUR * 60;
	const topPercent = (startMinutes / totalMinutes) * 100;
	const heightPercent = ((endMinutes - startMinutes) / totalMinutes) * 100;

	return {
		topPercent: Math.max(0, topPercent),
		heightPercent: Math.min(100 - Math.max(0, topPercent), heightPercent),
	};
}

export function buildAvailabilityBlocks(
	availability: Array<Tables<'teacher_availability'>>,
	roomsById: ReadonlyMap<string, AvailabilityRoomRef> = new Map(),
	agenda: AgendaSetting = APP_SETTINGS_BOOTSTRAP.agenda,
): AvailabilityBlock[] {
	return availability.map((entry) => {
		const displayDay = entry.day_of_week === 0 ? 6 : entry.day_of_week - 1;
		const geometry = availabilityGeometryFromTimes(entry.start_time, entry.end_time, agenda);
		const roomId = entry.room_id ?? null;
		const room = roomId ? (roomsById.get(roomId) ?? null) : null;

		return {
			id: entry.id,
			displayDay,
			startTime: entry.start_time,
			endTime: entry.end_time,
			topPercent: geometry.topPercent,
			heightPercent: geometry.heightPercent,
			roomId,
			roomName: room?.name ?? null,
			roomColor: room?.color ?? null,
		};
	});
}

export function availabilityPercentDeltaToMinutes(
	deltaPercent: number,
	agenda: AgendaSetting = APP_SETTINGS_BOOTSTRAP.agenda,
): number {
	const config = availabilityConfigFromAgenda(agenda);
	const totalMinutes = (config.END_HOUR - config.START_HOUR) * 60;
	const rawMinutes = (deltaPercent / 100) * totalMinutes;
	return snapMinutesToSlot(rawMinutes, config.SLOT_DURATION_MINUTES);
}

function parseAvailabilityBlockMinuteBounds(startTime: string, endTime: string): { start: number; end: number } | null {
	const start = timeToMinutes(formatTime(startTime));
	const end = timeToMinutes(formatTime(endTime));
	if (start === null || end === null) return null;
	return { start, end };
}

export function applyAvailabilityBlockMove(params: {
	startTime: string;
	endTime: string;
	deltaMinutes: number;
	agenda: AgendaSetting;
}): AvailabilityTimeForm | null {
	const bounds = parseAvailabilityBlockMinuteBounds(params.startTime, params.endTime);
	if (!bounds) return null;

	const duration = bounds.end - bounds.start;
	const config = availabilityConfigFromAgenda(params.agenda);
	const minStart = config.START_HOUR * 60;
	const maxEnd = config.END_HOUR * 60;

	let nextStart = bounds.start + params.deltaMinutes;
	let nextEnd = nextStart + duration;

	if (nextStart < minStart) {
		nextStart = minStart;
		nextEnd = nextStart + duration;
	}
	if (nextEnd > maxEnd) {
		nextEnd = maxEnd;
		nextStart = nextEnd - duration;
	}
	if (nextStart < minStart) {
		return {
			start_time: minutesToHHmm(bounds.start),
			end_time: minutesToHHmm(bounds.end),
			room_id: null,
		};
	}

	return {
		start_time: minutesToHHmm(nextStart),
		end_time: minutesToHHmm(nextEnd),
		room_id: null,
	};
}

export function applyAvailabilityBlockResize(params: {
	startTime: string;
	endTime: string;
	edge: 'start' | 'end';
	deltaMinutes: number;
	agenda: AgendaSetting;
}): AvailabilityTimeForm | null {
	const bounds = parseAvailabilityBlockMinuteBounds(params.startTime, params.endTime);
	if (!bounds) return null;

	const config = availabilityConfigFromAgenda(params.agenda);
	const minStart = config.START_HOUR * 60;
	const maxEnd = config.END_HOUR * 60;
	const minDuration = config.SLOT_DURATION_MINUTES;

	if (params.edge === 'start') {
		const nextStart = Math.min(
			Math.max(minStart, snapMinutesToSlot(bounds.start + params.deltaMinutes, config.SLOT_DURATION_MINUTES)),
			bounds.end - minDuration,
		);
		return {
			start_time: minutesToHHmm(nextStart),
			end_time: minutesToHHmm(bounds.end),
			room_id: null,
		};
	}

	const nextEnd = Math.max(
		Math.min(maxEnd, snapMinutesToSlot(bounds.end + params.deltaMinutes, config.SLOT_DURATION_MINUTES)),
		bounds.start + minDuration,
	);
	return {
		start_time: minutesToHHmm(bounds.start),
		end_time: minutesToHHmm(nextEnd),
		room_id: null,
	};
}

export function resolveAvailabilityBlockPointerTimes(params: {
	mode: AvailabilityBlockPointerMode;
	startTime: string;
	endTime: string;
	deltaMinutes: number;
	agenda: AgendaSetting;
}): AvailabilityTimeForm | null {
	if (params.mode === 'move') {
		return applyAvailabilityBlockMove(params);
	}
	return applyAvailabilityBlockResize({
		...params,
		edge: params.mode === 'resize-start' ? 'start' : 'end',
	});
}

export function didAvailabilityBlockDrag(deltaYPx: number): boolean {
	return Math.abs(deltaYPx) >= AVAILABILITY_BLOCK_DRAG_THRESHOLD_PX;
}

export type AvailabilityPointerEndAction =
	| { kind: 'click' }
	| { kind: 'commit'; form: AvailabilityTimeForm }
	| { kind: 'noop' };

export function resolveAvailabilityPointerEndAction(params: {
	deltaYPx: number;
	preview: AvailabilityTimeForm | null;
	original: Pick<AvailabilityBlock, 'startTime' | 'endTime'>;
}): AvailabilityPointerEndAction {
	if (!didAvailabilityBlockDrag(params.deltaYPx)) return { kind: 'click' };
	if (params.preview && availabilityBlockTimesChanged(params.original, params.preview)) {
		return { kind: 'commit', form: params.preview };
	}
	return { kind: 'noop' };
}

export type AvailabilityCreatePointerEndAction =
	| { kind: 'click' }
	| { kind: 'commit'; form: AvailabilityTimeForm }
	| { kind: 'noop' };

export function resolveAvailabilityCreatePointerEndAction(params: {
	deltaYPx: number;
	preview: AvailabilityTimeForm | null;
}): AvailabilityCreatePointerEndAction {
	if (!didAvailabilityBlockDrag(params.deltaYPx)) return { kind: 'click' };
	if (params.preview) return { kind: 'commit', form: params.preview };
	return { kind: 'noop' };
}

export function computeAvailabilityBlockPointerPreview(params: {
	mode: AvailabilityBlockPointerMode;
	originStartTime: string;
	originEndTime: string;
	startClientY: number;
	currentClientY: number;
	columnHeight: number;
	agenda: AgendaSetting;
}): AvailabilityTimeForm | null {
	if (params.columnHeight <= 0) return null;
	const deltaPercent = ((params.currentClientY - params.startClientY) / params.columnHeight) * 100;
	const deltaMinutes = availabilityPercentDeltaToMinutes(deltaPercent, params.agenda);
	return resolveAvailabilityBlockPointerTimes({
		mode: params.mode,
		startTime: params.originStartTime,
		endTime: params.originEndTime,
		deltaMinutes,
		agenda: params.agenda,
	});
}

export function canStartAvailabilityBlockPointer(canEdit: boolean, isPendingSave: boolean): boolean {
	return canEdit && !isPendingSave;
}

export function availabilityBlockCursorClass(canEdit: boolean, isDragging: boolean, isPendingSave: boolean): string {
	if (!canEdit || isPendingSave) return 'cursor-default';
	return isDragging ? 'cursor-grabbing' : 'cursor-grab';
}

export function availabilityBlockTimesChanged(
	original: Pick<AvailabilityBlock, 'startTime' | 'endTime'>,
	next: AvailabilityTimeForm,
): boolean {
	return hasTimeChange(next.start_time, original.startTime) || hasTimeChange(next.end_time, original.endTime);
}

export interface AvailabilityDayBlockRef {
	id: string;
	startTime: string;
	endTime: string;
	roomId: string | null;
}

export type AvailabilitySlotWritePlan =
	| { kind: 'insert'; form: AvailabilityTimeForm }
	| { kind: 'update'; keepId: string; form: AvailabilityTimeForm; deleteIds: string[] };

/** Overlap or touch (adjacent endpoints) — both should merge into one block. */
export function availabilityRangesTouchOrOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
	const a0 = timeToMinutes(formatTime(start1));
	const a1 = timeToMinutes(formatTime(end1));
	const b0 = timeToMinutes(formatTime(start2));
	const b1 = timeToMinutes(formatTime(end2));
	if (a0 === null || a1 === null || b0 === null || b1 === null) return false;
	return a0 <= b1 && b0 <= a1;
}

export function mergeAvailabilityTimeForms(forms: AvailabilityTimeForm[]): AvailabilityTimeForm | null {
	if (forms.length === 0) return null;

	let start = formatTime(forms[0].start_time);
	let end = formatTime(forms[0].end_time);
	const roomId = forms[0].room_id;
	for (const form of forms.slice(1)) {
		const formStart = formatTime(form.start_time);
		const formEnd = formatTime(form.end_time);
		if (formStart < start) start = formStart;
		if (formEnd > end) end = formEnd;
	}

	return { start_time: start, end_time: end, room_id: roomId };
}

export function planAvailabilitySlotWrite(params: {
	dayBlocks: AvailabilityDayBlockRef[];
	form: AvailabilityTimeForm;
	movingBlockId?: string;
}): AvailabilitySlotWritePlan {
	const others = params.dayBlocks.filter((block) => block.id !== params.movingBlockId);
	const overlapping = others.filter(
		(block) =>
			params.form.room_id === block.roomId &&
			availabilityRangesTouchOrOverlap(
				params.form.start_time,
				params.form.end_time,
				block.startTime,
				block.endTime,
			),
	);

	const merged = mergeAvailabilityTimeForms([
		{
			start_time: formatTime(params.form.start_time),
			end_time: formatTime(params.form.end_time),
			room_id: params.form.room_id,
		},
		...overlapping.map((block) => ({
			start_time: formatTime(block.startTime),
			end_time: formatTime(block.endTime),
			room_id: block.roomId,
		})),
	]);

	if (!merged) {
		return params.movingBlockId
			? { kind: 'update', keepId: params.movingBlockId, form: params.form, deleteIds: [] }
			: { kind: 'insert', form: params.form };
	}

	if (params.movingBlockId) {
		return {
			kind: 'update',
			keepId: params.movingBlockId,
			form: merged,
			deleteIds: overlapping.map((block) => block.id),
		};
	}

	if (overlapping.length === 0) {
		return { kind: 'insert', form: merged };
	}

	const keep = [...overlapping].sort((left, right) =>
		formatTime(left.startTime).localeCompare(formatTime(right.startTime)),
	)[0];

	return {
		kind: 'update',
		keepId: keep.id,
		form: merged,
		deleteIds: overlapping.filter((block) => block.id !== keep.id).map((block) => block.id),
	};
}

export function toAvailabilityDayBlockRefs(blocks: AvailabilityBlock[], displayDay: number): AvailabilityDayBlockRef[] {
	return getAvailabilityBlocksForDay(blocks, displayDay).map((block) => ({
		id: block.id,
		startTime: block.startTime,
		endTime: block.endTime,
		roomId: block.roomId,
	}));
}

/** Map a Y position inside a day column to absolute minutes from midnight. */
export function availabilityPointerYToMinutes(params: {
	clientY: number;
	columnTop: number;
	columnHeight: number;
	agenda: AgendaSetting;
}): number | null {
	if (params.columnHeight <= 0) return null;
	const config = availabilityConfigFromAgenda(params.agenda);
	const totalMinutes = (config.END_HOUR - config.START_HOUR) * 60;
	const ratio = (params.clientY - params.columnTop) / params.columnHeight;
	const clamped = Math.min(1, Math.max(0, ratio));
	return config.START_HOUR * 60 + clamped * totalMinutes;
}

/** Build a create-range from origin + current pointer minutes (same-day drag). */
export function buildAvailabilityCreateRangeFromMinutes(params: {
	originMinutes: number;
	currentMinutes: number;
	agenda: AgendaSetting;
}): AvailabilityTimeForm {
	const config = availabilityConfigFromAgenda(params.agenda);
	const slot = config.SLOT_DURATION_MINUTES;
	const minStart = config.START_HOUR * 60;
	const maxEnd = config.END_HOUR * 60;

	const originSlot = Math.floor(params.originMinutes / slot) * slot;
	const currentSlot = Math.floor(params.currentMinutes / slot) * slot;
	let start = Math.min(originSlot, currentSlot);
	let end = Math.max(originSlot, currentSlot) + slot;

	start = Math.max(minStart, Math.min(start, maxEnd - slot));
	end = Math.max(start + slot, Math.min(end, maxEnd));

	return {
		start_time: minutesToHHmm(start),
		end_time: minutesToHHmm(end),
		room_id: null,
	};
}

export function getAvailabilityBlocksForDay(blocks: AvailabilityBlock[], displayDay: number): AvailabilityBlock[] {
	return blocks.filter((block) => block.displayDay === displayDay);
}

function getNextAvailabilityTimeSlot(time: string, slots: number, timeSlots: string[]): string {
	const index = timeSlots.indexOf(time);
	if (index === -1 || index + slots >= timeSlots.length) {
		return timeSlots[timeSlots.length - 1];
	}
	return timeSlots[index + slots];
}

function availabilityBlockDurationMinutes(startTime: string, endTime: string): number {
	const [startHour, startMinute] = startTime.split(':').map(Number);
	const [endHour, endMinute] = endTime.split(':').map(Number);
	return (endHour - startHour) * 60 + (endMinute - startMinute);
}

export function shouldShowAvailabilityBlockTimes(startTime: string, endTime: string): boolean {
	return availabilityBlockDurationMinutes(startTime, endTime) > 30;
}

export function availabilityBlockDisplayTimes(
	preview: AvailabilityTimeForm | null,
	block: Pick<AvailabilityBlock, 'startTime' | 'endTime'>,
): { start: string; end: string } {
	if (!preview) {
		return { start: block.startTime, end: block.endTime };
	}
	return { start: preview.start_time, end: preview.end_time };
}

export function isAvailabilityTimeRangeValid(startTime: string, endTime: string): boolean {
	return startTime < endTime;
}

export function findAvailabilityBlockCoveringTime(
	blocks: AvailabilityBlock[],
	time: string,
): AvailabilityBlock | undefined {
	return blocks.find((block) => block.startTime <= time && block.endTime > time);
}

export function buildAvailabilitySlotFormFromClick(time: string, timeSlots: string[]): AvailabilityTimeForm {
	return {
		start_time: time,
		end_time: getNextAvailabilityTimeSlot(time, 2, timeSlots),
		room_id: null,
	};
}

export function buildAvailabilitySlotFormFromBlock(
	startTime: string,
	endTime: string,
	roomId: string | null = null,
): AvailabilityTimeForm {
	return {
		start_time: startTime,
		end_time: endTime,
		room_id: roomId,
	};
}

/** CSS classes for a slot without a room (grey + light diagonal hatch). */
export function availabilityUnassignedRoomSurfaceClass(isPendingSave: boolean): string {
	if (isPendingSave) {
		return 'bg-muted/50 border-muted-foreground/30 border-dashed bg-[repeating-linear-gradient(-45deg,transparent,transparent_3px,rgba(0,0,0,0.05)_3px,rgba(0,0,0,0.05)_6px)]';
	}
	return 'bg-muted border-muted-foreground/40 bg-[repeating-linear-gradient(-45deg,transparent,transparent_3px,rgba(0,0,0,0.06)_3px,rgba(0,0,0,0.06)_6px)]';
}

export function availabilityUnassignedRoomLegendSwatchClass(): string {
	return 'h-3 w-5 rounded-sm border border-muted-foreground/40 bg-muted bg-[repeating-linear-gradient(-45deg,transparent,transparent_2px,rgba(0,0,0,0.07)_2px,rgba(0,0,0,0.07)_4px)]';
}

/** Rooms that appear on at least one availability block, in the given room order. */
export function roomsUsedInAvailability(
	rooms: readonly AvailabilityRoomRef[],
	blocks: readonly Pick<AvailabilityBlock, 'roomId'>[],
): AvailabilityRoomRef[] {
	const usedIds = new Set<string>();
	for (const block of blocks) {
		if (block.roomId) usedIds.add(block.roomId);
	}
	return rooms.filter((room) => usedIds.has(room.id));
}

export function availabilityIncludesUnassignedRoom(blocks: readonly Pick<AvailabilityBlock, 'roomId'>[]): boolean {
	return blocks.some((block) => block.roomId === null);
}

export function getAvailabilityHourTopPercent(
	hour: number,
	agenda: AgendaSetting = APP_SETTINGS_BOOTSTRAP.agenda,
): number {
	const config = availabilityConfigFromAgenda(agenda);
	return ((hour - config.START_HOUR) / (config.END_HOUR - config.START_HOUR)) * 100;
}

export function getAvailabilitySlotPosition(
	time: string,
	agenda: AgendaSetting = APP_SETTINGS_BOOTSTRAP.agenda,
): { topPercent: number; heightPercent: number } {
	const config = availabilityConfigFromAgenda(agenda);
	const totalMinutes = (config.END_HOUR - config.START_HOUR) * 60;
	const [hour, minute] = time.split(':').map(Number);
	const minutesFromStart = (hour - config.START_HOUR) * 60 + minute;
	return {
		topPercent: (minutesFromStart / totalMinutes) * 100,
		heightPercent: (config.SLOT_DURATION_MINUTES / totalMinutes) * 100,
	};
}

export type AvailabilityDialogDescription =
	| { mode: 'edit'; dayName: string }
	| { mode: 'add'; dayName: string; startTime: string };

export function getAvailabilityDialogTitle(editingBlock: AvailabilityBlock | null): string {
	return editingBlock ? 'Tijdslot wijzigen' : 'Nieuw tijdslot toevoegen';
}

export function getAvailabilityDialogDescription(
	selectedSlot: { day: number; time: string } | null,
	editingBlock: AvailabilityBlock | null,
	dayNames: readonly string[],
): AvailabilityDialogDescription | null {
	if (!selectedSlot) return null;

	const dayName = dayNames[selectedSlot.day] ?? '';
	if (editingBlock) {
		return { mode: 'edit', dayName };
	}

	return { mode: 'add', dayName, startTime: selectedSlot.time };
}

export function getAvailabilityEndTimeOptions(startTime: string, timeSlots: string[]): string[] {
	return timeSlots.filter((time) => time > startTime);
}

export function getAvailabilityDialogDescriptionText(
	description: AvailabilityDialogDescription | null,
): { prefix: string; dayName: string; startTime?: string } | null {
	if (!description) return null;
	if (description.mode === 'edit') {
		return { prefix: 'Wijzig beschikbaarheid voor', dayName: description.dayName };
	}
	return {
		prefix: 'Voeg beschikbaarheid toe voor',
		dayName: description.dayName,
		startTime: description.startTime,
	};
}
