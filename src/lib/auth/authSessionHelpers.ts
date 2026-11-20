import type { Session, User } from '@supabase/supabase-js';
import type { AppRole } from '@/lib/roles';

/** Max wait for auth session + role/teacher probes before showing the offline screen. */
export const AUTH_BOOTSTRAP_TIMEOUT_MS = 2_000;

export function resolveAuthRoleFlags(role: AppRole | null, teacherUserId: string | null) {
	const isAdmin = role === 'admin';
	const isSiteAdmin = role === 'site_admin';
	const isStaff = role === 'staff';
	const isTeacher = teacherUserId !== null;
	return {
		isAdmin,
		isSiteAdmin,
		isStaff,
		isTeacher,
		isPrivileged: isAdmin || isSiteAdmin || isStaff,
	};
}

/** Active person for RLS/UI: JWT claim when present, else the login user id. */
export function resolveActiveProfileId(user: User | null | undefined): string | null {
	if (!user) return null;
	const claim = user.app_metadata?.active_profile_id;
	if (typeof claim === 'string' && claim.length > 0) return claim;
	return user.id;
}

/**
 * When the current active profile is not a student, pick the first membership
 * profile that has a students row (shared-login parent → child).
 */
export function pickStudentProfileToActivate(params: {
	currentActiveProfileId: string;
	membershipProfileIds: string[];
	studentProfileIds: string[];
}): string | null {
	if (params.studentProfileIds.includes(params.currentActiveProfileId)) {
		return null;
	}
	const preferred = params.membershipProfileIds.find((id) => params.studentProfileIds.includes(id));
	return preferred ?? null;
}

export interface AuthSessionApplyPlan {
	userId: string | null;
	activeProfileId: string | null;
	shouldFetchRoleAndTeacher: boolean;
	shouldClearRoleOnLogout: boolean;
}

export type AuthBackendProbeError = { message?: string } | null;

export function planAuthSessionApply(session: Session | null, clearOnLogout: boolean): AuthSessionApplyPlan {
	const userId = session?.user?.id ?? null;
	return {
		userId,
		activeProfileId: resolveActiveProfileId(session?.user ?? null),
		shouldFetchRoleAndTeacher: userId !== null,
		shouldClearRoleOnLogout: userId === null && clearOnLogout,
	};
}

export function isAuthBackendUnreachableError(error: AuthBackendProbeError | undefined): boolean {
	const message = error?.message?.toLowerCase() ?? '';
	if (message.length === 0) return false;
	return (
		message.includes('failed to fetch') ||
		message.includes('networkerror') ||
		message.includes('network request failed') ||
		message.includes('fetch failed') ||
		message.includes('load failed')
	);
}

/** Stale/expired JWT or wiped auth (e.g. after `db reset`) — clear local session. */
export function isAuthSessionInvalidError(error: AuthBackendProbeError | undefined): boolean {
	const message = error?.message?.toLowerCase() ?? '';
	if (message.length === 0) return false;
	return (
		message.includes('invalid jwt') ||
		message.includes('jwt expired') ||
		message.includes('invalid claim') ||
		message.includes('session not found') ||
		message.includes('refresh token') ||
		message.includes('refresh_token') ||
		message.includes('user not found') ||
		message.includes('invalid token') ||
		message.includes('auth session missing')
	);
}

export function getFunctionsErrorHttpStatus(error: unknown): number | null {
	if (!error || typeof error !== 'object') return null;
	const context = (error as { context?: unknown }).context;
	if (!context || typeof context !== 'object') return null;
	const status = (context as { status?: unknown }).status;
	return typeof status === 'number' ? status : null;
}

/** After DB reset / expired refresh, switch-profile 401 or refresh failure → force login. */
export function shouldSignOutAfterProfileSwitchFailure(params: {
	switchError: unknown;
	refreshError: AuthBackendProbeError;
}): boolean {
	if (getFunctionsErrorHttpStatus(params.switchError) === 401) return true;
	if (params.refreshError) return true;
	if (isAuthSessionInvalidError(params.switchError as AuthBackendProbeError)) return true;
	return false;
}

export type ResolveInitialAuthSessionDeps = {
	getSession: () => Promise<{ data: { session: Session | null } }>;
	getUser: () => Promise<{ error: AuthBackendProbeError }>;
	signOutLocal: () => Promise<unknown>;
};

/**
 * `getSession()` only reads storage. After a DB reset the JWT may still be present but
 * invalid against Auth — validate with `getUser()` and clear local storage when it fails.
 */
export async function resolveInitialAuthSession(
	deps: ResolveInitialAuthSessionDeps,
): Promise<Session | null> {
	const {
		data: { session },
	} = await deps.getSession();
	if (!session) return null;

	const { error } = await deps.getUser();
	if (error) {
		await deps.signOutLocal();
		return null;
	}

	const {
		data: { session: validated },
	} = await deps.getSession();
	return validated;
}

export function resolveAuthBootstrapProbeOutcome(
	roleError: AuthBackendProbeError,
	teacherError: AuthBackendProbeError,
): 'ready' | 'unavailable' {
	if (isAuthBackendUnreachableError(roleError) || isAuthBackendUnreachableError(teacherError)) {
		return 'unavailable';
	}
	return 'ready';
}

export function runAuthSessionSideEffects(params: {
	plan: AuthSessionApplyPlan;
	fetchRole: (userId: string) => Promise<AuthBackendProbeError>;
	fetchTeacher: (userId: string) => Promise<AuthBackendProbeError>;
	clearRoleState: () => void;
	onLoadingComplete: () => void;
	onBackendUnavailable: () => void;
}): void {
	if (params.plan.shouldFetchRoleAndTeacher && params.plan.userId) {
		const teacherProbeId = params.plan.activeProfileId ?? params.plan.userId;
		void Promise.all([params.fetchRole(params.plan.userId), params.fetchTeacher(teacherProbeId)])
			.then(([roleError, teacherError]) => {
				if (resolveAuthBootstrapProbeOutcome(roleError, teacherError) === 'unavailable') {
					params.onBackendUnavailable();
					return;
				}
				params.onLoadingComplete();
			})
			.catch(() => {
				params.onBackendUnavailable();
			});
		return;
	}
	if (params.plan.shouldClearRoleOnLogout) {
		params.clearRoleState();
	}
	params.onLoadingComplete();
}
