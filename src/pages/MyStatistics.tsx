import { Navigate } from 'react-router-dom';
import { MyStatisticsCards } from '@/components/statistics/MyStatisticsCards';
import { PageShell } from '@/components/ui/page-shell';
import { NAV_LABELS } from '@/config/nav-labels';
import { useAuth } from '@/hooks/useAuth';
import { useMyStatisticsPage } from '@/hooks/useMyStatisticsPage';
import { shouldRedirectMyStatistics, shouldShowMyStatisticsSkeleton } from '@/lib/statistics/myStatisticsPageHelpers';

export default function MyStatistics() {
	const { isTeacher, teacherUserId, isLoading: authLoading } = useAuth();
	const { loading, stats } = useMyStatisticsPage({ authLoading, isTeacher, teacherUserId });

	if (shouldRedirectMyStatistics(authLoading, isTeacher)) {
		return <Navigate to="/" replace />;
	}

	if (shouldShowMyStatisticsSkeleton(authLoading, loading)) {
		return <PageShell title={NAV_LABELS.myStatistics} description="Overzicht van je lesactiviteiten" loading />;
	}

	return (
		<PageShell title={NAV_LABELS.myStatistics} description="Overzicht van je lesactiviteiten">
			<MyStatisticsCards stats={stats} />
		</PageShell>
	);
}
