import {
	endOfMonth,
	endOfQuarter,
	endOfYear,
	startOfMonth,
	startOfQuarter,
	startOfYear,
	subMonths,
	subQuarters,
	subYears,
} from 'date-fns';
import { formatDateToDb } from '@/lib/date/date-format';
import { APP_SETTINGS_BOOTSTRAP } from '@/lib/settings/appSettingsDefaults';

export type BasePeriodPreset = 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'this_year' | 'custom';

export type ExtendedPeriodPreset = BasePeriodPreset | 'last_year' | 'this_school_year' | 'last_school_year';

export const BASE_PRESET_LABELS: Record<BasePeriodPreset, string> = {
	this_month: 'Deze maand',
	last_month: 'Vorige maand',
	this_quarter: 'Dit kwartaal',
	last_quarter: 'Vorig kwartaal',
	this_year: 'Dit jaar',
	custom: 'Aangepast',
};

export const ACCOUNTING_PRESET_LABELS: Record<ExtendedPeriodPreset, string> = {
	...BASE_PRESET_LABELS,
	last_year: 'Vorig jaar',
	this_school_year: 'Dit schooljaar',
	last_school_year: 'Vorig schooljaar',
};

function schoolYearRange(now: Date, startMonth: number): { start: Date; end: Date } {
	const month = now.getMonth() + 1;
	const year = now.getFullYear();
	const startYear = month >= startMonth ? year : year - 1;
	const start = new Date(startYear, startMonth - 1, 1);
	const end = new Date(startYear + 1, startMonth - 1, 0);
	return { start, end };
}

export function getPresetDateRange(
	preset: ExtendedPeriodPreset,
	options?: { schoolStartMonth?: number; now?: Date },
): { start: string; end: string } {
	const now = options?.now ?? new Date();
	switch (preset) {
		case 'this_month':
			return { start: formatDateToDb(startOfMonth(now)), end: formatDateToDb(endOfMonth(now)) };
		case 'last_month': {
			const prev = subMonths(now, 1);
			return { start: formatDateToDb(startOfMonth(prev)), end: formatDateToDb(endOfMonth(prev)) };
		}
		case 'this_quarter':
			return { start: formatDateToDb(startOfQuarter(now)), end: formatDateToDb(endOfQuarter(now)) };
		case 'last_quarter': {
			const prevQ = subQuarters(now, 1);
			return { start: formatDateToDb(startOfQuarter(prevQ)), end: formatDateToDb(endOfQuarter(prevQ)) };
		}
		case 'this_year':
			return { start: formatDateToDb(startOfYear(now)), end: formatDateToDb(endOfYear(now)) };
		case 'last_year': {
			const prevY = subYears(now, 1);
			return { start: formatDateToDb(startOfYear(prevY)), end: formatDateToDb(endOfYear(prevY)) };
		}
		case 'this_school_year': {
			const schoolStartMonth = options?.schoolStartMonth ?? APP_SETTINGS_BOOTSTRAP.school_year.start_month;
			const range = schoolYearRange(now, schoolStartMonth);
			return { start: formatDateToDb(range.start), end: formatDateToDb(range.end) };
		}
		case 'last_school_year': {
			const schoolStartMonth = options?.schoolStartMonth ?? APP_SETTINGS_BOOTSTRAP.school_year.start_month;
			const range = schoolYearRange(subYears(now, 1), schoolStartMonth);
			return { start: formatDateToDb(range.start), end: formatDateToDb(range.end) };
		}
		default:
			return { start: formatDateToDb(startOfMonth(now)), end: formatDateToDb(endOfMonth(now)) };
	}
}
