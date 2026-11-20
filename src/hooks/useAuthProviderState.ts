import type { Session, User } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
	AUTH_BOOTSTRAP_TIMEOUT_MS,
	type AuthBackendProbeError,
	planAuthSessionApply,
	resolveActiveProfileId,
	resolveAuthRoleFlags,
	resolveInitialAuthSession,
	runAuthSessionSideEffects,
	shouldSignOutAfterProfileSwitchFailure,
} from '@/lib/auth/authSessionHelpers';
import {
	joinMembershipsWithProfiles,
	type MembershipProfileDisplay,
	shouldShowProfilePicker,
} from '@/lib/auth/profilePickerHelpers';
import type { AppRole } from '@/lib/roles';

export type SwitchAndRefreshResult =
	| { ok: true; session: Session }
	| { ok: false; shouldSignOut: boolean };

export async function loadMembershipProfiles(loginUserId: string): Promise<MembershipProfileDisplay[]> {
	const { data: memberships, error: membershipsError } = await supabase
		.from('account_memberships')
		.select('profile_id, role')
		.eq('login_user_id', loginUserId);
	if (membershipsError) {
		console.error('Error listing account memberships:', membershipsError);
		return [];
	}
	const rows = memberships ?? [];
	if (rows.length === 0) return [];

	const { data: profiles, error: profilesError } = await supabase
		.from('profiles')
		.select('user_id, first_name, last_name, avatar_url')
		.in(
			'user_id',
			rows.map((row) => row.profile_id),
		);
	if (profilesError) {
		console.error('Error listing membership profiles:', profilesError);
		return [];
	}

	return joinMembershipsWithProfiles(rows, profiles ?? []);
}

export async function switchAndRefreshSession(profileId: string): Promise<SwitchAndRefreshResult> {
	const { error: switchError } = await supabase.functions.invoke('switch-profile', {
		body: { profile_id: profileId },
	});
	if (switchError) {
		console.error('Error switching profile:', switchError);
		return {
			ok: false,
			shouldSignOut: shouldSignOutAfterProfileSwitchFailure({ switchError, refreshError: null }),
		};
	}

	const { data, error: refreshError } = await supabase.auth.refreshSession();
	if (refreshError || !data.session) {
		console.error('Error refreshing session after profile switch:', refreshError);
		return {
			ok: false,
			shouldSignOut: shouldSignOutAfterProfileSwitchFailure({
				switchError: null,
				refreshError: refreshError ?? { message: 'session missing after refresh' },
			}),
		};
	}
	return { ok: true, session: data.session };
}

async function clearLocalAuthSession(): Promise<void> {
	await supabase.auth.signOut({ scope: 'local' });
}

export async function applyAuthenticatedSession(params: {
	nextSession: Session | null;
	options: { resetProfileSelection: boolean; clearOnLogout: boolean };
	suppressSelectionReset: boolean;
	fetchRole: (userId: string) => Promise<AuthBackendProbeError>;
	fetchTeacher: (profileId: string) => Promise<AuthBackendProbeError>;
	clearRoleState: () => void;
	completeLoading: () => void;
	markUnavailable: () => void;
	setSession: (session: Session | null) => void;
	setUser: (user: User | null) => void;
	setActiveProfileId: (profileId: string | null) => void;
	setMembershipProfiles: (profiles: MembershipProfileDisplay[]) => void;
	setProfileSelectionCompletedThisSession: (completed: boolean) => void;
}): Promise<void> {
	if (!params.nextSession?.user) {
		params.setSession(null);
		params.setUser(null);
		params.setActiveProfileId(null);
		params.setMembershipProfiles([]);
		params.setProfileSelectionCompletedThisSession(false);
		runAuthSessionSideEffects({
			plan: planAuthSessionApply(null, params.options.clearOnLogout),
			fetchRole: params.fetchRole,
			fetchTeacher: params.fetchTeacher,
			clearRoleState: params.clearRoleState,
			onLoadingComplete: params.completeLoading,
			onBackendUnavailable: params.markUnavailable,
		});
		return;
	}

	const profiles = await loadMembershipProfiles(params.nextSession.user.id);
	params.setMembershipProfiles(profiles);
	if (params.options.resetProfileSelection && !params.suppressSelectionReset) {
		params.setProfileSelectionCompletedThisSession(false);
	}

	params.setSession(params.nextSession);
	params.setUser(params.nextSession.user);
	params.setActiveProfileId(resolveActiveProfileId(params.nextSession.user));
	runAuthSessionSideEffects({
		plan: planAuthSessionApply(params.nextSession, params.options.clearOnLogout),
		fetchRole: params.fetchRole,
		fetchTeacher: params.fetchTeacher,
		clearRoleState: params.clearRoleState,
		onLoadingComplete: params.completeLoading,
		onBackendUnavailable: params.markUnavailable,
	});
}

function useAuthBootstrapLoading() {
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
		setIsUnavailable(false);
		setIsLoading(false);
	}, [clearBootstrapTimeout]);

	const markUnavailable = useCallback(() => {
		clearBootstrapTimeout();
		setIsUnavailable(true);
		setIsLoading(false);
	}, [clearBootstrapTimeout]);

	return {
		isLoading,
		isUnavailable,
		bootstrapTimeoutRef,
		clearBootstrapTimeout,
		completeLoading,
		markUnavailable,
	};
}

function useAuthRoleProbes(activeProfileId: string | null, user: User | null) {
	const [role, setRole] = useState<AppRole | null>(null);
	const [teacherUserId, setTeacherUserId] = useState<string | null>(null);

	const fetchRole = useCallback(async (userId: string): Promise<AuthBackendProbeError> => {
		// Zero rows is normal for teachers/students. Array `.limit(1)` avoids PostgREST singular HTTP 406.
		const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', userId).limit(1);

		if (error) {
			console.error('Error fetching user role:', error);
			setRole(null);
			return error;
		}
		setRole(data?.[0]?.role ?? null);
		return null;
	}, []);

	const fetchTeacher = useCallback(async (profileId: string): Promise<AuthBackendProbeError> => {
		const { data, error } = await supabase.from('teachers').select('user_id').eq('user_id', profileId).limit(1);

		if (error) {
			console.error('Error fetching teacher:', error);
			setTeacherUserId(null);
			return error;
		}
		setTeacherUserId(data?.[0]?.user_id ?? null);
		return null;
	}, []);

	const clearRoleState = useCallback(() => {
		setRole(null);
		setTeacherUserId(null);
	}, []);

	const refreshRole = useCallback(async () => {
		if (!user) return;
		const profileId = activeProfileId ?? user.id;
		await Promise.all([fetchRole(user.id), fetchTeacher(profileId)]);
	}, [user, activeProfileId, fetchRole, fetchTeacher]);

	return {
		role,
		teacherUserId,
		fetchRole,
		fetchTeacher,
		clearRoleState,
		refreshRole,
	};
}

function subscribeAuthSession(
	applySession: (
		session: Session | null,
		options: { resetProfileSelection: boolean; clearOnLogout: boolean },
	) => void,
	markUnavailable: () => void,
) {
	void resolveInitialAuthSession({
		getSession: () => supabase.auth.getSession(),
		getUser: async () => {
			const { error } = await supabase.auth.getUser();
			return { error };
		},
		signOutLocal: clearLocalAuthSession,
	})
		.then((nextSession) => {
			applySession(nextSession, { resetProfileSelection: true, clearOnLogout: false });
		})
		.catch((error: unknown) => {
			console.error('Error loading auth session:', error);
			markUnavailable();
		});

	const {
		data: { subscription },
	} = supabase.auth.onAuthStateChange((event, nextSession) => {
		applySession(nextSession, {
			resetProfileSelection: event === 'SIGNED_IN' || event === 'SIGNED_OUT',
			clearOnLogout: event === 'SIGNED_OUT',
		});
	});

	return subscription;
}

export function useAuthProviderState() {
	const [user, setUser] = useState<User | null>(null);
	const [session, setSession] = useState<Session | null>(null);
	const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
	const [membershipProfiles, setMembershipProfiles] = useState<MembershipProfileDisplay[]>([]);
	const [profileSelectionCompletedThisSession, setProfileSelectionCompletedThisSession] = useState(false);
	const [isSelectingProfile, setIsSelectingProfile] = useState(false);
	const suppressSelectionResetRef = useRef(false);
	const { isLoading, isUnavailable, bootstrapTimeoutRef, clearBootstrapTimeout, completeLoading, markUnavailable } =
		useAuthBootstrapLoading();
	const { role, teacherUserId, fetchRole, fetchTeacher, clearRoleState, refreshRole } = useAuthRoleProbes(
		activeProfileId,
		user,
	);

	const applySession = useCallback(
		(nextSession: Session | null, options: { resetProfileSelection: boolean; clearOnLogout: boolean }) => {
			void applyAuthenticatedSession({
				nextSession,
				options,
				suppressSelectionReset: suppressSelectionResetRef.current,
				fetchRole,
				fetchTeacher,
				clearRoleState,
				completeLoading,
				markUnavailable,
				setSession,
				setUser,
				setActiveProfileId,
				setMembershipProfiles,
				setProfileSelectionCompletedThisSession,
			});
		},
		[fetchRole, fetchTeacher, clearRoleState, completeLoading, markUnavailable],
	);

	useEffect(() => {
		bootstrapTimeoutRef.current = setTimeout(markUnavailable, AUTH_BOOTSTRAP_TIMEOUT_MS);
		const subscription = subscribeAuthSession(applySession, markUnavailable);
		return () => {
			clearBootstrapTimeout();
			subscription.unsubscribe();
		};
	}, [applySession, clearBootstrapTimeout, markUnavailable, bootstrapTimeoutRef]);

	const selectProfile = useCallback(
		async (profileId: string) => {
			setIsSelectingProfile(true);
			suppressSelectionResetRef.current = true;
			const result = await switchAndRefreshSession(profileId);
			suppressSelectionResetRef.current = false;
			setIsSelectingProfile(false);
			if (!result.ok) {
				if (result.shouldSignOut) {
					await clearLocalAuthSession();
					return false;
				}
				toast.error('Kon profiel niet wisselen. Probeer opnieuw.');
				return false;
			}

			const nextSession = result.session;
			setProfileSelectionCompletedThisSession(true);
			setSession(nextSession);
			setUser(nextSession.user);
			setActiveProfileId(resolveActiveProfileId(nextSession.user));
			await Promise.all([
				fetchRole(nextSession.user.id),
				fetchTeacher(resolveActiveProfileId(nextSession.user) ?? nextSession.user.id),
			]);
			return true;
		},
		[fetchRole, fetchTeacher],
	);

	const reopenProfileSelection = useCallback(() => {
		setProfileSelectionCompletedThisSession(false);
	}, []);

	const signOut = async () => {
		const { error } = await supabase.auth.signOut();
		if (error) {
			await clearLocalAuthSession();
		}
	};

	const needsProfileSelection = shouldShowProfilePicker({
		membershipCount: membershipProfiles.length,
		profileSelectionCompletedThisSession,
	});

	return {
		isUnavailable,
		value: {
			user,
			session,
			activeProfileId,
			membershipProfiles,
			needsProfileSelection,
			isSelectingProfile,
			selectProfile,
			reopenProfileSelection,
			role,
			isLoading,
			...resolveAuthRoleFlags(role, teacherUserId),
			teacherUserId,
			signOut,
			refreshRole,
		},
	};
}
