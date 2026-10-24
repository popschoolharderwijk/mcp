import { Navigate } from 'react-router-dom';
import { MyStatisticsCards } from '@/components/statistics/MyStatisticsCards';
import { NavPageShell } from '@/components/ui/nav-page-shell';
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
		return <NavPageShell item="myStatistics" loading />;
	}

	return (
		<NavPageShell item="myStatistics">
			<MyStatisticsCards stats={stats} />
		</NavPageShell>
	);
}
