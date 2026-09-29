import { Navigate } from 'react-router-dom';
import { NoLessonPeriodsManager } from '@/components/settings/NoLessonPeriodsManager';
import { useAuth } from '@/hooks/useAuth';

export default function NoLessonPeriods() {
	const { isAdmin, isSiteAdmin, isLoading } = useAuth();

	if (isLoading) return null;
	if (!(isAdmin || isSiteAdmin)) return <Navigate to="/" replace />;

	return <NoLessonPeriodsManager />;
}
