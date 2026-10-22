import { useCallback, useEffect, useState } from 'react';
import { loadAllAppSettings, saveAppSetting } from '@/lib/settings/appSettingsClient';
import { APP_SETTINGS_BOOTSTRAP } from '@/lib/settings/appSettingsDefaults';
import type { AppSettingKey, AppSettingsMap, AppSettingValueByKey } from '@/lib/settings/appSettingsTypes';

export function useAppSettings() {
	const [settings, setSettings] = useState<AppSettingsMap>(APP_SETTINGS_BOOTSTRAP);
	const [loading, setLoading] = useState(true);

	const reload = useCallback(async () => {
		setLoading(true);
		const next = await loadAllAppSettings();
		setSettings(next);
		setLoading(false);
	}, []);

	useEffect(() => {
		void reload();
	}, [reload]);

	const save = useCallback(
		async <K extends AppSettingKey>(
			key: K,
			value: AppSettingValueByKey[K],
			updatedBy: string | null,
		): Promise<string | null> => {
			const { error } = await saveAppSetting(key, value, updatedBy);
			if (!error) {
				setSettings((prev) => ({ ...prev, [key]: value }));
			}
			return error;
		},
		[],
	);

	return { settings, loading, reload, save };
}
