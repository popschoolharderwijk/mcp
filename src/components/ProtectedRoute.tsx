import { Navigate } from 'react-router-dom';
import { ProfilePickerScreen } from '@/components/auth/ProfilePickerScreen';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
	children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
	const {
		user,
		isLoading,
		needsProfileSelection,
		membershipProfiles,
		isSelectingProfile,
		selectProfile,
		signOut,
	} = useAuth();

	if (isLoading) {
		return <PageSkeleton variant="header-only" />;
	}

	if (!user) {
		return <Navigate to="/login" replace />;
	}

	if (needsProfileSelection) {
		return (
			<ProfilePickerScreen
				profiles={membershipProfiles}
				isSelecting={isSelectingProfile}
				onSelect={(profileId) => {
					void selectProfile(profileId);
				}}
				onSignOut={() => {
					void signOut();
				}}
			/>
		);
	}

	return <>{children}</>;
}
