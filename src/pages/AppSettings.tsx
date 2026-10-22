import { useParams } from 'react-router-dom';
import { AppSettingsGate } from '@/components/settings/AppSettingsGate';
import { useAuth } from '@/hooks/useAuth';
import { resolveAppSettingsAccess, resolveAppSettingsTabRedirect } from '@/lib/settings/appSettingsTabsHelpers';
import { AppSettingsPage } from '@/pages/AppSettingsPage';

export default function AppSettings() {
	const { isAdmin, isSiteAdmin, isLoading: authLoading } = useAuth();
	const { tab: tabParam } = useParams<{ tab?: string }>();
	const access = resolveAppSettingsAccess(
		authLoading,
		isAdmin || isSiteAdmin,
		resolveAppSettingsTabRedirect(tabParam),
	);

	if (access.kind !== 'ok') {
		return <AppSettingsGate access={access} />;
	}

	return <AppSettingsPage tabParam={tabParam} canEdit={isSiteAdmin} />;
}
