import { AdminSiteGuard } from '@/components/auth/AdminSiteGuard';
import { AccountingSettingsManager } from '@/components/settings/AccountingSettingsManager';
import { NavPageShell } from '@/components/ui/nav-page-shell';

export default function AccountingSettingsPage() {
	return (
		<AdminSiteGuard>
			<NavPageShell item="accountingSettings">
				<AccountingSettingsManager />
			</NavPageShell>
		</AdminSiteGuard>
	);
}
