import { isAppSettingKey, parseAppSettingValue } from '@/lib/settings/appSettingsParseHelpers';
import type { AppSettingsMap } from '@/lib/settings/appSettingsTypes';

export type AppSettingsRow = { key: string; value: unknown };

/** Merge DB rows onto bootstrap defaults; skip unknown keys and invalid values. */
export function mergeAppSettingsRows(bootstrap: AppSettingsMap, rows: AppSettingsRow[] | null): AppSettingsMap {
	const result: AppSettingsMap = { ...bootstrap };
	if (!rows) return result;
	for (const row of rows) {
		if (!isAppSettingKey(row.key)) continue;
		const parsed = parseAppSettingValue(row.key, row.value);
		if (parsed) {
			(result as Record<string, unknown>)[row.key] = parsed;
		}
	}
	return result;
}
