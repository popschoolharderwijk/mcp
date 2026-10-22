import type { Session, User } from '@supabase/supabase-js';
import { createContext, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { ServiceUnavailableScreen } from '@/components/ServiceUnavailableScreen';
import { supabase } from '@/integrations/supabase/client';
import {
	AUTH_BOOTSTRAP_TIMEOUT_MS,
	type AuthBackendProbeError,
	planAuthSessionApply,
	runAuthSessionSideEffects,
} from '@/lib/auth/authSessionHelpers';
import type { AppRole } from '@/lib/roles';

interface AuthContextType {
	user: User | null;
	session: Session | null;
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
	const [user, setUser] = useState<User | null>(null);
	const [session, setSession] = useState<Session | null>(null);
	const [role, setRole] = useState<AppRole | null>(null);
	const [teacherUserId, setTeacherUserId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isUnavailable, setIsUnavailable] = useState(false);
	const bootstrapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearBootstrapTimeout = useCallback(() => {
		if (bootstrapTimeoutRef.current === null) return;
		clearTimeout(bootstrapTimeoutRef.current);
		bootstrapTimeoutRef.current = null;
	}, []);

	const completeLoading = useCallback(() => {
		clearBootstrapTimeout();
		setIsLoading(false);
	}, [clearBootstrapTimeout]);

	const markUnavailable = useCallback(() => {
		clearBootstrapTimeout();
		setIsUnavailable(true);
		setIsLoading(false);
	}, [clearBootstrapTimeout]);

	const fetchRole = useCallback(async (userId: string): Promise<AuthBackendProbeError> => {
		const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle();

		if (error) {
			console.error('Error fetching user role:', error);
			setRole(null);
			return error;
		}
		setRole(data?.role ?? null);
		return null;
	}, []);

	const fetchTeacher = useCallback(async (userId: string): Promise<AuthBackendProbeError> => {
		const { data, error } = await supabase.from('teachers').select('user_id').eq('user_id', userId).maybeSingle();

		if (error) {
			console.error('Error fetching teacher:', error);
			setTeacherUserId(null);
			return error;
		}
		setTeacherUserId(data?.user_id ?? null);
		return null;
	}, []);

	const refreshRole = useCallback(async () => {
		if (user) {
			await Promise.all([fetchRole(user.id), fetchTeacher(user.id)]);
		}
	}, [user, fetchRole, fetchTeacher]);

	const applySession = useCallback(
		(session: Session | null, clearOnLogout: boolean) => {
			setSession(session);
			setUser(session?.user ?? null);
			runAuthSessionSideEffects({
				plan: planAuthSessionApply(session, clearOnLogout),
				fetchRole,
				fetchTeacher,
				clearRoleState: () => {
					setRole(null);
					setTeacherUserId(null);
				},
				onLoadingComplete: completeLoading,
				onBackendUnavailable: markUnavailable,
			});
		},
		[fetchRole, fetchTeacher, completeLoading, markUnavailable],
	);

	useEffect(() => {
		bootstrapTimeoutRef.current = setTimeout(markUnavailable, AUTH_BOOTSTRAP_TIMEOUT_MS);

		supabase.auth
			.getSession()
			.then(({ data: { session } }) => {
				applySession(session, false);
			})
			.catch((error: unknown) => {
				console.error('Error loading auth session:', error);
				markUnavailable();
			});

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			applySession(session, true);
		});

		return () => {
			clearBootstrapTimeout();
			subscription.unsubscribe();
		};
	}, [applySession, clearBootstrapTimeout, markUnavailable]);

	const signOut = async () => {
		await supabase.auth.signOut();
	};

	const isAdmin = role === 'admin';
	const isSiteAdmin = role === 'site_admin';
	const isStaff = role === 'staff';
	const isTeacher = teacherUserId !== null;
	const isPrivileged = isAdmin || isSiteAdmin || isStaff;

	return (
		<AuthContext.Provider
			value={{
				user,
				session,
				role,
				isLoading,
				isAdmin,
				isSiteAdmin,
				isStaff,
				isTeacher,
				isPrivileged,
				teacherUserId,
				signOut,
				refreshRole,
			}}
		>
			{isUnavailable ? <ServiceUnavailableScreen /> : children}
		</AuthContext.Provider>
	);
}
