import type { AgendaSetting } from '@/lib/settings/appSettingsTypes';
import { hourToTimeString } from '@/lib/time/time-format';

/** Start hours offered in agenda settings (matches parse range 0–23). */
const AGENDA_START_HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => hour);

/** End hours offered in agenda settings (matches parse range 1–24). */
const AGENDA_END_HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => index + 1);

/** Slot durations (minutes) offered in agenda settings. */
export const AGENDA_SLOT_MINUTE_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120] as const;

/** Ensure a stored value remains selectable even when outside the preset list. */
export function withCurrentNumberOption(options: readonly number[], current: number): number[] {
	if (options.includes(current)) return [...options];
	return [...options, current].sort((a, b) => a - b);
}

export function formatAgendaHourOption(hour: number): string {
	if (hour === 24) return '24:00';
	return hourToTimeString(hour);
}

/** Start hour must be strictly before end hour (same rule as parseAgenda). */
export function isAgendaHourRangeValid(startHour: number, endHour: number): boolean {
	return startHour < endHour;
}

/** End-hour options that stay after the chosen start hour. */
export function agendaEndHourOptionsForStart(startHour: number): number[] {
	return AGENDA_END_HOUR_OPTIONS.filter((hour) => hour > startHour);
}

/** Start-hour options that stay before the chosen end hour. */
export function agendaStartHourOptionsForEnd(endHour: number): number[] {
	return AGENDA_START_HOUR_OPTIONS.filter((hour) => hour < endHour);
}

/** Dutch summary of configured agenda day window and slot length. */
export function describeAgendaSetting(agenda: AgendaSetting): string {
	return `Een agenda dag loopt van ${agenda.start_hour} uur tot ${agenda.end_hour} uur, met blokken van ${agenda.slot_minutes} minuten.`;
}
