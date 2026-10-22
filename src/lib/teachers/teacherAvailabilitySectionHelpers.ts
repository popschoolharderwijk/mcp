import type { Tables } from '@/integrations/supabase/types';
import {
	availabilityConfigFromAgenda,
	availabilityDefaultEndTime,
	availabilityDefaultStartTime,
} from '@/lib/availability';
import { APP_SETTINGS_BOOTSTRAP } from '@/lib/settings/appSettingsDefaults';
import type { AgendaSetting } from '@/lib/settings/appSettingsTypes';

export interface AvailabilityBlock {
	id: string;
	displayDay: number;
	startTime: string;
	endTime: string;
	topPercent: number;
	heightPercent: number;
}

export interface AvailabilityTimeForm {
	start_time: string;
	end_time: string;
}

export function defaultAvailabilityTimeForm(
	agenda: AgendaSetting = APP_SETTINGS_BOOTSTRAP.agenda,
): AvailabilityTimeForm {
	return {
		start_time: availabilityDefaultStartTime(agenda),
		end_time: availabilityDefaultEndTime(agenda),
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

export function buildAvailabilityBlocks(
	availability: Tables<'teacher_availability'>[],
	agenda: AgendaSetting = APP_SETTINGS_BOOTSTRAP.agenda,
): AvailabilityBlock[] {
	const config = availabilityConfigFromAgenda(agenda);
	const totalMinutes = (config.END_HOUR - config.START_HOUR) * 60;

	return availability.map((entry) => {
		const displayDay = entry.day_of_week === 0 ? 6 : entry.day_of_week - 1;
		const [startHour, startMin] = entry.start_time.split(':').map(Number);
		const [endHour, endMin] = entry.end_time.split(':').map(Number);
		const startMinutes = (startHour - config.START_HOUR) * 60 + startMin;
		const endMinutes = (endHour - config.START_HOUR) * 60 + endMin;
		const topPercent = (startMinutes / totalMinutes) * 100;
		const heightPercent = ((endMinutes - startMinutes) / totalMinutes) * 100;

		return {
			id: entry.id,
			displayDay,
			startTime: entry.start_time,
			endTime: entry.end_time,
			topPercent: Math.max(0, topPercent),
			heightPercent: Math.min(100 - topPercent, heightPercent),
		};
	});
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
	};
}

export function buildAvailabilitySlotFormFromBlock(startTime: string, endTime: string): AvailabilityTimeForm {
	return {
		start_time: startTime,
		end_time: endTime,
	};
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

export function getTeacherAvailabilityCardDescription(canEdit: boolean): string {
	return canEdit ? 'Klik op lege cel om toe te voegen, op tijdslot om te wijzigen' : 'Beschikbare tijdsloten';
}

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
