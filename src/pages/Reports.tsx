import { Navigate } from 'react-router-dom';
import { ReportsPageBody } from '@/components/reports/ReportsPageBody';
import { NavPageShell } from '@/components/ui/nav-page-shell';
import { useReportsPage } from '@/hooks/useReportsPage';
import { BASE_PRESET_LABELS, type BasePeriodPreset } from '@/lib/reports/periodPresets';
import { shouldRedirectReportsAccess } from '@/lib/reports/reportsPageHelpers';

const REPORT_PRESETS = Object.keys(BASE_PRESET_LABELS) as BasePeriodPreset[];

export default function Reports() {
	const page = useReportsPage();

	if (shouldRedirectReportsAccess(page.authLoading, page.hasAccess)) {
		return <Navigate to="/" replace />;
	}

	if (page.authLoading) {
		return (
			<NavPageShell
				item="reports"
				loading
			/>
		);
	}

	return <ReportsPageBody reportPresets={REPORT_PRESETS} page={page} />;
}
