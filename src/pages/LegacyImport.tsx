import { AdminSiteGuard } from '@/components/auth/AdminSiteGuard';
import { LegacyImportManager } from '@/components/settings/LegacyImportManager';

export default function LegacyImportPage() {
	return (
		<AdminSiteGuard>
			<LegacyImportManager />
		</AdminSiteGuard>
	);
}
