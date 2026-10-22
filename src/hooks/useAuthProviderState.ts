import type { Session, User } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
	AUTH_BOOTSTRAP_TIMEOUT_MS,
	type AuthBackendProbeError,
	planAuthSessionApply,
	resolveAuthRoleFlags,
	runAuthSessionSideEffects,
} from '@/lib/auth/authSessionHelpers';
import type { AppRole } from '@/lib/roles';

export function useAuthProviderState() {
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
		(nextSession: Session | null, clearOnLogout: boolean) => {
			setSession(nextSession);
			setUser(nextSession?.user ?? null);
			runAuthSessionSideEffects({
				plan: planAuthSessionApply(nextSession, clearOnLogout),
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
			.then(({ data: { session: nextSession } }) => {
				applySession(nextSession, false);
			})
			.catch((error: unknown) => {
				console.error('Error loading auth session:', error);
				markUnavailable();
			});

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, nextSession) => {
			applySession(nextSession, true);
		});

		return () => {
			clearBootstrapTimeout();
			subscription.unsubscribe();
		};
	}, [applySession, clearBootstrapTimeout, markUnavailable]);

	const signOut = async () => {
		await supabase.auth.signOut();
	};

	return {
		isUnavailable,
		value: {
			user,
			session,
			role,
			isLoading,
			...resolveAuthRoleFlags(role, teacherUserId),
			teacherUserId,
			signOut,
			refreshRole,
		},
	};
}
