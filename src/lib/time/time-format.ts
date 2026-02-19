import { format } from 'date-fns';
import { timeToMinutes } from './time-range';

export function hourToTimeString(hour: number): string {
	return `${String(hour).padStart(2, '0')}:00`;
}

export function formatTime(timeStr: string): string {
	if (timeToMinutes(timeStr) === null) return '';
	return timeStr.substring(0, 5);
}

export function normalizeTime(timeStr: string): string {
	if (timeToMinutes(timeStr) === null) return '';
	return timeStr.length === 5 ? `${timeStr}:00` : timeStr;
}

export function formatTimeFromDate(date: Date): string {
	return format(date, 'HH:mm');
}

export function normalizeTimeFromDate(date: Date): string {
	return format(date, 'HH:mm:ss');
}
