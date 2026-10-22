import { APP_SETTINGS_BOOTSTRAP } from '@/lib/settings/appSettingsDefaults';
import type { AgendaSetting } from '@/lib/settings/appSettingsTypes';
import { hourToTimeString } from './time/time-format';

/** Agenda hours from app_settings.agenda (bootstrap defaults until loaded from DB). */
function agendaConfigFromSetting(agenda: AgendaSetting) {
	return {
		START_HOUR: agenda.start_hour,
		END_HOUR: agenda.end_hour,
		SLOT_DURATION_MINUTES: agenda.slot_minutes,
	} as const;
}

/** Sync default matching bootstrap.sql — prefer loaded settings in UI/hooks when available. */
export const AVAILABILITY_CONFIG = agendaConfigFromSetting(APP_SETTINGS_BOOTSTRAP.agenda);

export const DEFAULT_START_TIME = hourToTimeString(AVAILABILITY_CONFIG.START_HOUR);
export const DEFAULT_END_TIME = hourToTimeString(AVAILABILITY_CONFIG.END_HOUR);
