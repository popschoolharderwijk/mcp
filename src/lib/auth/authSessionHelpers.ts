import type { Session } from '@supabase/supabase-js';

/** Max wait for auth session + role/teacher probes before showing the offline screen. */
export const AUTH_BOOTSTRAP_TIMEOUT_MS = 2_000;

export interface AuthSessionApplyPlan {
	userId: string | null;
	shouldFetchRoleAndTeacher: boolean;
	shouldClearRoleOnLogout: boolean;
}

export type AuthBackendProbeError = { message?: string } | null;

export function planAuthSessionApply(session: Session | null, clearOnLogout: boolean): AuthSessionApplyPlan {
	const userId = session?.user?.id ?? null;
	return {
		userId,
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
		void Promise.all([params.fetchRole(params.plan.userId), params.fetchTeacher(params.plan.userId)])
			.then(([roleError, teacherError]) => {
				if (resolveAuthBootstrapProbeOutcome(roleError, teacherError) === 'unavailable') {
					params.onBackendUnavailable();
				}
				params.onLoadingComplete();
			})
			.catch(() => {
				params.onBackendUnavailable();
				params.onLoadingComplete();
			});
		return;
	}
	if (params.plan.shouldClearRoleOnLogout) {
		params.clearRoleState();
	}
	params.onLoadingComplete();
}
