import { type ExtendedPeriodPreset, getPresetDateRange } from '@/lib/reports/periodPresets';

export function applyAccountingPresetChange(
	preset: ExtendedPeriodPreset,
	schoolStartMonth: number,
	now?: Date,
): { startDate: string; endDate: string } | null {
	if (preset === 'custom') return null;
	const range = getPresetDateRange(preset, { schoolStartMonth, now });
	return { startDate: range.start, endDate: range.end };
}
