import { hourToTimeString } from './time/time-format';

export const AVAILABILITY_CONFIG = {
	START_HOUR: 9,
	END_HOUR: 21,
	SLOT_DURATION_MINUTES: 30,
} as const;

export const DEFAULT_START_TIME = hourToTimeString(AVAILABILITY_CONFIG.START_HOUR);
export const DEFAULT_END_TIME = hourToTimeString(AVAILABILITY_CONFIG.END_HOUR);
