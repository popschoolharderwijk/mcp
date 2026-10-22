import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { APP_SETTINGS_BOOTSTRAP } from '@/lib/settings/appSettingsDefaults';
import { mergeAppSettingsRows } from '@/lib/settings/appSettingsMergeHelpers';
import { parseAppSettingValue } from '@/lib/settings/appSettingsParseHelpers';
import type { AppSettingKey, AppSettingsMap, AppSettingValueByKey } from '@/lib/settings/appSettingsTypes';

export async function loadAllAppSettings(): Promise<AppSettingsMap> {
	const { data, error } = await supabase.from('app_settings').select('key, value');
	if (error || !data) return { ...APP_SETTINGS_BOOTSTRAP };
	return mergeAppSettingsRows(APP_SETTINGS_BOOTSTRAP, data);
}

export async function saveAppSetting<K extends AppSettingKey>(
	key: K,
	value: AppSettingValueByKey[K],
	updatedBy: string | null,
): Promise<{ error: string | null }> {
	if (!parseAppSettingValue(key, value)) {
		return { error: 'Ongeldige instelling' };
	}
	const { error } = await supabase
		.from('app_settings')
		.upsert(
			{ key, value: JSON.parse(JSON.stringify(value)) as Json, updated_by: updatedBy },
			{ onConflict: 'key' },
		);
	return { error: error?.message ?? null };
}
