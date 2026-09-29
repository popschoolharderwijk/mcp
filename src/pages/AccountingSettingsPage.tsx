import { AdminSiteGuard } from '@/components/auth/AdminSiteGuard';
import { AccountingSettingsManager } from '@/components/settings/AccountingSettingsManager';
import { PageShell } from '@/components/ui/page-shell';
import { NAV_LABELS } from '@/config/nav-labels';

export default function AccountingSettingsPage() {
	return (
		<AdminSiteGuard>
			<PageShell title={NAV_LABELS.accountingSettings} description="Rekeningen, BTW en kostenplaatsen voor Exact">
				<AccountingSettingsManager />
			</PageShell>
		</AdminSiteGuard>
	);
}
