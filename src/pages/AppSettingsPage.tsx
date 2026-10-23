import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSettingsContext } from '@/components/AppSettingsProvider';
import { persistAppSettingSave } from '@/components/settings/AppSettingsForms';
import { AppSettingsTabPanels } from '@/components/settings/AppSettingsTabPanels';
import { PageShell } from '@/components/ui/page-shell';
import { NAV_LABELS } from '@/config/nav-labels';
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
		<PageShell
			title={NAV_LABELS.settings}
			description="Schooljaar, lesvrije periodes, agenda, tarieven, e-mailtemplates en overige siteconfiguratie"
			loading={loading}
			width="3/4"
		>
			<AppSettingsTabPanels
				settings={settings}
				canEdit={canEdit}
				savingKey={savingKey}
				activeTab={activeTab}
				onTabChange={onTabChange}
				onSave={onSave}
			/>
		</PageShell>
	);
}
