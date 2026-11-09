import type { LessonAgreement } from '@/components/students/LessonAgreementItem';
import type { DashboardStatItem } from '@/lib/dashboard/dashboardStatsGridHelpers';
import { buildStudentDashboardStatItems, type StudentDashboardData } from '@/lib/dashboard/studentDashboardHelpers';

export async function fetchProfileFirstName(
	loadRow: () => Promise<{ first_name: string | null } | null>,
): Promise<string | null> {
	const data = await loadRow();
	if (!data?.first_name) return null;
	return data.first_name;
}

export function resolveStudentAgreementsCardView(isLoading: boolean, hasDashboard: boolean): 'skeleton' | 'card' {
	if (isLoading || !hasDashboard) return 'skeleton';
	return 'card';
}

export function studentDashboardPanelModel(studentDashboard: StudentDashboardData | null): {
	items: DashboardStatItem[];
	agreements: LessonAgreement[];
} {
	if (!studentDashboard) {
		return { items: [], agreements: [] };
	}
	return {
		items: buildStudentDashboardStatItems(studentDashboard.stats),
		agreements: studentDashboard.agreements,
	};
}
