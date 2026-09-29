import { Navigate } from 'react-router-dom';
import { AccountingReportContent } from '@/components/reports/AccountingReportContent';
import { PageShell } from '@/components/ui/page-shell';
import { NAV_LABELS } from '@/config/nav-labels';
import { useAccountingReportPage } from '@/hooks/useAccountingReportPage';
import { resolveAccountingReportPageView } from '@/lib/accounting/accountingReportPageHelpers';

export default function AccountingReportPage() {
	const state = useAccountingReportPage();
	const view = resolveAccountingReportPageView(state.authLoading, state.hasAccess, state.settingsLoading);

	if (view === 'redirect') {
		return <Navigate to="/" replace />;
	}
	if (view === 'loading') {
		return <PageShell title={NAV_LABELS.accounting} description="Boekhoudrapportage voor Exact Online" loading />;
	}

	return <AccountingReportContent state={state} />;
}
