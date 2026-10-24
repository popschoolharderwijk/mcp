import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSettingsContext } from '@/components/AppSettingsProvider';
import { persistAppSettingSave } from '@/components/settings/AppSettingsForms';
import { AppSettingsTabPanels } from '@/components/settings/AppSettingsTabPanels';
import { NavPageShell } from '@/components/ui/nav-page-shell';
import { useAuth } from '@/hooks/useAuth';
import {
	type AppSettingsTabId,
	parseAppSettingsTab,
	resolveAppSettingsTabRoute,
} from '@/lib/settings/appSettingsTabsHelpers';
import type { AppSettingsMap, AppSettingValueByKey } from '@/lib/settings/appSettingsTypes';

interface AppSettingsPageProps {
	tabParam: string | undefined;
	canEdit: boolean;
}

export function AppSettingsPage({ tabParam, canEdit }: AppSettingsPageProps) {
	const navigate = useNavigate();
	const { user } = useAuth();
	const activeTab = parseAppSettingsTab(tabParam);
	const { settings, loading, save } = useAppSettingsContext();
	const [savingKey, setSavingKey] = useState<string | null>(null);

	const onTabChange = (tab: AppSettingsTabId) => {
		navigate(resolveAppSettingsTabRoute(tab));
	};

	const onSave = async <K extends keyof AppSettingsMap>(key: K, value: AppSettingValueByKey[K]) => {
		setSavingKey(key);
		await persistAppSettingSave(() => save(key, value, user?.id ?? null), 'Instellingen opgeslagen');
		setSavingKey(null);
	};

	return (
		<NavPageShell
			item="settings"
			loading={loading}
			width="full"
		>
			<AppSettingsTabPanels
				settings={settings}
				canEdit={canEdit}
				savingKey={savingKey}
				activeTab={activeTab}
				onTabChange={onTabChange}
				onSave={onSave}
			/>
		</NavPageShell>
	);
}
