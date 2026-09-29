import { Navigate } from 'react-router-dom';
import { AnnouncementsManager } from '@/components/settings/AnnouncementsManager';
import { useAuth } from '@/hooks/useAuth';

export default function Announcements() {
	const { isAdmin, isSiteAdmin, isLoading } = useAuth();

	if (isLoading) return null;
	if (!(isAdmin || isSiteAdmin)) return <Navigate to="/" replace />;

	return <AnnouncementsManager />;
}
