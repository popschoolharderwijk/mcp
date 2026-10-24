import { Navigate } from 'react-router-dom';
import { MyTrialPageContent } from '@/components/trial-lessons/MyTrialPageContent';
import { useAuth } from '@/hooks/useAuth';

type MyTrialPageGate = 'auth-loading' | 'unauthenticated' | 'ready';

function resolveMyTrialPageGate(isAuthLoading: boolean, hasUser: boolean): MyTrialPageGate {
	if (isAuthLoading) return 'auth-loading';
	if (!hasUser) return 'unauthenticated';
	return 'ready';
}

export default function MyTrial() {
	const { user, isLoading } = useAuth();

	const pageGate = resolveMyTrialPageGate(isLoading, user !== null);
	if (pageGate === 'auth-loading') return null;
	if (pageGate === 'unauthenticated') return <Navigate to="/login" replace />;
	if (!user) return null;

	return <MyTrialPageContent userId={user.id} />;
}
