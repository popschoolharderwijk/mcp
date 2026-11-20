import type { Session, User } from '@supabase/supabase-js';
import { createContext, type ReactNode } from 'react';
import { ServiceUnavailableScreen } from '@/components/ServiceUnavailableScreen';
import { useAuthProviderState } from '@/hooks/useAuthProviderState';
import type { MembershipProfileDisplay } from '@/lib/auth/profilePickerHelpers';
import type { AppRole } from '@/lib/roles';

interface AuthContextType {
	user: User | null;
	session: Session | null;
	/** Active person id (JWT claim or login user). Used for student/teacher “own” data. */
	activeProfileId: string | null;
	membershipProfiles: MembershipProfileDisplay[];
	needsProfileSelection: boolean;
	isSelectingProfile: boolean;
	selectProfile: (profileId: string) => Promise<boolean>;
	reopenProfileSelection: () => void;
	role: AppRole | null;
	isLoading: boolean;
	isAdmin: boolean;
	isSiteAdmin: boolean;
	isStaff: boolean;
	isTeacher: boolean;
	isPrivileged: boolean;
	teacherUserId: string | null;
	signOut: () => Promise<void>;
	refreshRole: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
	children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
	const { isUnavailable, value } = useAuthProviderState();

	return (
		<AuthContext.Provider value={value}>
			{isUnavailable ? <ServiceUnavailableScreen /> : children}
		</AuthContext.Provider>
	);
}
