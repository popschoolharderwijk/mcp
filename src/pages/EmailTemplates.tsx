import { Navigate } from 'react-router-dom';
import { EmailTemplatesManager } from '@/components/settings/EmailTemplatesManager';
import { useAuth } from '@/hooks/useAuth';

export default function EmailTemplates() {
	const { isAdmin, isSiteAdmin, isLoading } = useAuth();

	if (isLoading) return null;
	if (!(isAdmin || isSiteAdmin)) return <Navigate to="/" replace />;

	return <EmailTemplatesManager />;
}
