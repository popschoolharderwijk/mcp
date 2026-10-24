import { Navigate } from 'react-router-dom';
import { AccountingReportContent } from '@/components/reports/AccountingReportContent';
import { NavPageShell } from '@/components/ui/nav-page-shell';
import { useAccountingReportPage } from '@/hooks/useAccountingReportPage';

type AccountingReportPageView = 'redirect' | 'loading' | 'content';

function resolveAccountingReportPageView(
	authLoading: boolean,
	hasAccess: boolean,
	settingsLoading: boolean,
): AccountingReportPageView {
	if (authLoading) return 'loading';
	if (!hasAccess) return 'redirect';
	return settingsLoading ? 'loading' : 'content';
}

export default function AccountingReportPage() {
	const state = useAccountingReportPage();
	const view = resolveAccountingReportPageView(state.authLoading, state.hasAccess, state.settingsLoading);

	if (view === 'redirect') {
		return <Navigate to="/" replace />;
	}
	if (view === 'loading') {
		return <NavPageShell item="accounting" loading />;
	}

	return <AccountingReportContent state={state} />;
}
