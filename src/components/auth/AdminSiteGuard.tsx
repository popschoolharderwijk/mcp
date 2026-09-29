import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { PageShellPlaceholder } from '@/components/ui/page-shell';
import { useAuth } from '@/hooks/useAuth';

interface AdminSiteGuardProps {
	children: ReactNode;
}

export function AdminSiteGuard({ children }: AdminSiteGuardProps) {
	const { isAdmin, isSiteAdmin, isLoading } = useAuth();
	const hasAccess = isAdmin || isSiteAdmin;

	if (isLoading) return <PageShellPlaceholder />;
	if (!hasAccess) return <Navigate to="/" replace />;

	return children;
}
