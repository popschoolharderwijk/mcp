import { APP_SETTINGS_BOOTSTRAP } from '@/lib/settings/appSettingsDefaults';
import type { AgendaSetting } from '@/lib/settings/appSettingsTypes';
import { hourToTimeString } from './time/time-format';

export type AvailabilityHourConfig = {
	START_HOUR: number;
	END_HOUR: number;
	SLOT_DURATION_MINUTES: number;
};

/** Map app_settings.agenda into the hour/slot shape used by teacher availability UI. */
export function availabilityConfigFromAgenda(
	agenda: AgendaSetting = APP_SETTINGS_BOOTSTRAP.agenda,
): AvailabilityHourConfig {
	return {
		START_HOUR: agenda.start_hour,
		END_HOUR: agenda.end_hour,
		SLOT_DURATION_MINUTES: agenda.slot_minutes,
	};
}

/** Bootstrap agenda window — callers with loaded settings should pass agenda explicitly. */
export const AVAILABILITY_CONFIG = availabilityConfigFromAgenda();

export const DEFAULT_START_TIME = hourToTimeString(AVAILABILITY_CONFIG.START_HOUR);
export const DEFAULT_END_TIME = hourToTimeString(AVAILABILITY_CONFIG.END_HOUR);

export function availabilityDefaultStartTime(agenda: AgendaSetting = APP_SETTINGS_BOOTSTRAP.agenda): string {
	return hourToTimeString(availabilityConfigFromAgenda(agenda).START_HOUR);
}

export function availabilityDefaultEndTime(agenda: AgendaSetting = APP_SETTINGS_BOOTSTRAP.agenda): string {
	return hourToTimeString(availabilityConfigFromAgenda(agenda).END_HOUR);
}
