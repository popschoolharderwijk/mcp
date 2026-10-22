import { Navigate } from 'react-router-dom';
import type { AppSettingsAccess } from '@/lib/settings/appSettingsTabsHelpers';

type BlockedAccess = Exclude<AppSettingsAccess, { kind: 'ok' }>;

export function AppSettingsGate({ access }: { access: BlockedAccess }) {
	if (access.kind === 'auth-loading') return null;
	if (access.kind === 'forbidden') return <Navigate to="/" replace />;
	return <Navigate to={access.to} replace />;
}
