import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
	children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
	const { user, isLoading } = useAuth();

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<p className="text-muted-foreground">Laden...</p>
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/login" replace />;
	}

	return <>{children}</>;
}
