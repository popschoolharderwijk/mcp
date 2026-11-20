import { describe, expect, it } from 'bun:test';
import {
	getFunctionsErrorHttpStatus,
	isAuthBackendUnreachableError,
	isAuthSessionInvalidError,
	pickStudentProfileToActivate,
	planAuthSessionApply,
	resolveActiveProfileId,
	resolveAuthBootstrapProbeOutcome,
	resolveAuthRoleFlags,
	resolveInitialAuthSession,
	runAuthSessionSideEffects,
	shouldSignOutAfterProfileSwitchFailure,
} from '../../../src/lib/auth/authSessionHelpers';

describe('planAuthSessionApply', () => {
	it('plans role fetch when session has a user', () => {
		expect(planAuthSessionApply({ user: { id: 'user-1' } } as never, false)).toEqual({
			userId: 'user-1',
			activeProfileId: 'user-1',
			shouldFetchRoleAndTeacher: true,
			shouldClearRoleOnLogout: false,
		});
	});

	it('uses active_profile_id claim when present', () => {
		expect(
			planAuthSessionApply(
				{ user: { id: 'user-1', app_metadata: { active_profile_id: 'child-1' } } } as never,
				false,
			),
		).toEqual({
			userId: 'user-1',
			activeProfileId: 'child-1',
			shouldFetchRoleAndTeacher: true,
			shouldClearRoleOnLogout: false,
		});
	});

	it('clears role on logout when session is missing', () => {
		expect(planAuthSessionApply(null, true)).toEqual({
			userId: null,
			activeProfileId: null,
			shouldFetchRoleAndTeacher: false,
			shouldClearRoleOnLogout: true,
		});
	});

	it('does not clear role when initial session is missing', () => {
		expect(planAuthSessionApply(null, false)).toEqual({
			userId: null,
			activeProfileId: null,
			shouldFetchRoleAndTeacher: false,
			shouldClearRoleOnLogout: false,
		});
	});
});

describe('resolveActiveProfileId', () => {
	it('returns null when user is missing', () => {
		expect(resolveActiveProfileId(null)).toBe(null);
	});

	it('returns login id when claim is absent', () => {
		expect(resolveActiveProfileId({ id: 'user-1' } as never)).toBe('user-1');
	});

	it('returns claim when present', () => {
		expect(resolveActiveProfileId({ id: 'user-1', app_metadata: { active_profile_id: 'child-1' } } as never)).toBe(
			'child-1',
		);
	});
});

describe('pickStudentProfileToActivate', () => {
	it('returns null when current active profile is already a student', () => {
		expect(
			pickStudentProfileToActivate({
				currentActiveProfileId: 'child-1',
				membershipProfileIds: ['child-1', 'child-2'],
				studentProfileIds: ['child-1', 'child-2'],
			}),
		).toBe(null);
	});

	it('picks the first membership profile that is a student', () => {
		expect(
			pickStudentProfileToActivate({
				currentActiveProfileId: 'parent-1',
				membershipProfileIds: ['parent-1', 'child-1', 'child-2'],
				studentProfileIds: ['child-1', 'child-2'],
			}),
		).toBe('child-1');
	});

	it('returns null when no membership profile is a student', () => {
		expect(
			pickStudentProfileToActivate({
				currentActiveProfileId: 'parent-1',
				membershipProfileIds: ['parent-1'],
				studentProfileIds: [],
			}),
		).toBe(null);
	});
});

describe('isAuthBackendUnreachableError', () => {
	it('returns true for failed to fetch', () => {
		expect(isAuthBackendUnreachableError({ message: 'Failed to fetch' })).toBe(true);
	});

	it('returns false for ordinary database errors', () => {
		expect(isAuthBackendUnreachableError({ message: 'permission denied for table user_roles' })).toBe(false);
	});

	it('returns false when error is missing', () => {
		expect(isAuthBackendUnreachableError(null)).toBe(false);
	});
});

describe('isAuthSessionInvalidError', () => {
	it('detects expired jwt messages', () => {
		expect(isAuthSessionInvalidError({ message: 'JWT expired' })).toBe(true);
	});

	it('detects refresh token failures', () => {
		expect(isAuthSessionInvalidError({ message: 'Invalid Refresh Token: Refresh Token Not Found' })).toBe(true);
	});

	it('returns false for ordinary database errors', () => {
		expect(isAuthSessionInvalidError({ message: 'permission denied for table user_roles' })).toBe(false);
	});
});

describe('getFunctionsErrorHttpStatus', () => {
	it('reads status from FunctionsHttpError context', () => {
		expect(getFunctionsErrorHttpStatus({ message: 'Edge Function returned a non-2xx status code', context: { status: 401 } })).toBe(
			401,
		);
	});

	it('returns null when context is missing', () => {
		expect(getFunctionsErrorHttpStatus({ message: 'Edge Function returned a non-2xx status code' })).toBe(null);
	});
});

describe('shouldSignOutAfterProfileSwitchFailure', () => {
	it('signs out on switch-profile 401', () => {
		expect(
			shouldSignOutAfterProfileSwitchFailure({
				switchError: { message: 'Edge Function returned a non-2xx status code', context: { status: 401 } },
				refreshError: null,
			}),
		).toBe(true);
	});

	it('signs out when session refresh fails', () => {
		expect(
			shouldSignOutAfterProfileSwitchFailure({
				switchError: null,
				refreshError: { message: 'Invalid Refresh Token' },
			}),
		).toBe(true);
	});

	it('keeps session on non-auth switch failures', () => {
		expect(
			shouldSignOutAfterProfileSwitchFailure({
				switchError: { message: 'Edge Function returned a non-2xx status code', context: { status: 403 } },
				refreshError: null,
			}),
		).toBe(false);
	});
});

describe('resolveInitialAuthSession', () => {
	it('returns null when storage has no session', async () => {
		expect(
			await resolveInitialAuthSession({
				getSession: async () => ({ data: { session: null } }),
				getUser: async () => ({ error: null }),
				signOutLocal: async () => {
					throw new Error('should not sign out');
				},
			}),
		).toBe(null);
	});

	it('clears local session when getUser rejects a stored jwt', async () => {
		let signedOut = false;
		expect(
			await resolveInitialAuthSession({
				getSession: async () => ({ data: { session: { access_token: 'stale' } as never } }),
				getUser: async () => ({ error: { message: 'Invalid Refresh Token: Refresh Token Not Found' } }),
				signOutLocal: async () => {
					signedOut = true;
				},
			}),
		).toBe(null);
		expect(signedOut).toBe(true);
	});

	it('re-reads session after getUser succeeds', async () => {
		const validated = { access_token: 'fresh' } as never;
		let getSessionCalls = 0;
		expect(
			await resolveInitialAuthSession({
				getSession: async () => {
					getSessionCalls += 1;
					if (getSessionCalls === 1) return { data: { session: { access_token: 'stale' } as never } };
					return { data: { session: validated } };
				},
				getUser: async () => ({ error: null }),
				signOutLocal: async () => {
					throw new Error('should not sign out');
				},
			}),
		).toBe(validated);
		expect(getSessionCalls).toBe(2);
	});
});

describe('resolveAuthBootstrapProbeOutcome', () => {
	it('marks unavailable when role probe cannot reach the backend', () => {
		expect(resolveAuthBootstrapProbeOutcome({ message: 'Failed to fetch' }, null)).toBe('unavailable');
	});

	it('marks ready when probes succeed or return non-network errors', () => {
		expect(resolveAuthBootstrapProbeOutcome(null, { message: 'JWT expired' })).toBe('ready');
	});
});

describe('runAuthSessionSideEffects', () => {
	it('fetches role and teacher when session has a user', async () => {
		let completed = false;
		let unavailable = false;
		const calls: string[] = [];
		runAuthSessionSideEffects({
			plan: {
				userId: 'user-1',
				activeProfileId: 'user-1',
				shouldFetchRoleAndTeacher: true,
				shouldClearRoleOnLogout: false,
			},
			fetchRole: async (userId) => {
				calls.push(`role:${userId}`);
				return null;
			},
			fetchTeacher: async (userId) => {
				calls.push(`teacher:${userId}`);
				return null;
			},
			clearRoleState: () => {
				calls.push('clear');
			},
			onLoadingComplete: () => {
				completed = true;
			},
			onBackendUnavailable: () => {
				unavailable = true;
			},
		});
		await new Promise<void>((resolve) => {
			setTimeout(resolve, 0);
		});
		expect(calls).toEqual(['role:user-1', 'teacher:user-1']);
		expect(completed).toBe(true);
		expect(unavailable).toBe(false);
	});

	it('probes teacher on active profile id when it differs from login', async () => {
		const calls: string[] = [];
		runAuthSessionSideEffects({
			plan: {
				userId: 'parent-1',
				activeProfileId: 'child-1',
				shouldFetchRoleAndTeacher: true,
				shouldClearRoleOnLogout: false,
			},
			fetchRole: async (userId) => {
				calls.push(`role:${userId}`);
				return null;
			},
			fetchTeacher: async (profileId) => {
				calls.push(`teacher:${profileId}`);
				return null;
			},
			clearRoleState: () => {},
			onLoadingComplete: () => {},
			onBackendUnavailable: () => {},
		});
		await new Promise<void>((resolve) => {
			setTimeout(resolve, 0);
		});
		expect(calls).toEqual(['role:parent-1', 'teacher:child-1']);
	});

	it('signals unavailable when a probe cannot reach the backend', async () => {
		let completed = false;
		let unavailable = false;
		runAuthSessionSideEffects({
			plan: {
				userId: 'user-1',
				activeProfileId: 'user-1',
				shouldFetchRoleAndTeacher: true,
				shouldClearRoleOnLogout: false,
			},
			fetchRole: async () => ({ message: 'Failed to fetch' }),
			fetchTeacher: async () => null,
			clearRoleState: () => {},
			onLoadingComplete: () => {
				completed = true;
			},
			onBackendUnavailable: () => {
				unavailable = true;
			},
		});
		await new Promise<void>((resolve) => {
			setTimeout(resolve, 0);
		});
		expect(unavailable).toBe(true);
		expect(completed).toBe(false);
	});

	it('signals unavailable when a probe throws', async () => {
		let completed = false;
		let unavailable = false;
		runAuthSessionSideEffects({
			plan: {
				userId: 'user-1',
				activeProfileId: 'user-1',
				shouldFetchRoleAndTeacher: true,
				shouldClearRoleOnLogout: false,
			},
			fetchRole: async () => {
				throw new Error('network down');
			},
			fetchTeacher: async () => null,
			clearRoleState: () => {},
			onLoadingComplete: () => {
				completed = true;
			},
			onBackendUnavailable: () => {
				unavailable = true;
			},
		});
		await new Promise<void>((resolve) => {
			setTimeout(resolve, 0);
		});
		expect(unavailable).toBe(true);
		expect(completed).toBe(false);
	});

	it('clears role state on logout', () => {
		let cleared = false;
		let completed = false;
		runAuthSessionSideEffects({
			plan: {
				userId: null,
				activeProfileId: null,
				shouldFetchRoleAndTeacher: false,
				shouldClearRoleOnLogout: true,
			},
			fetchRole: async () => null,
			fetchTeacher: async () => null,
			clearRoleState: () => {
				cleared = true;
			},
			onLoadingComplete: () => {
				completed = true;
			},
			onBackendUnavailable: () => {},
		});
		expect(cleared).toBe(true);
		expect(completed).toBe(true);
	});
});

describe('resolveAuthRoleFlags', () => {
	it('marks site admin as privileged without teacher flag', () => {
		expect(resolveAuthRoleFlags('site_admin', null)).toEqual({
			isAdmin: false,
			isSiteAdmin: true,
			isStaff: false,
			isTeacher: false,
			isPrivileged: true,
		});
	});

	it('marks teacher when teacher user id is present', () => {
		expect(resolveAuthRoleFlags(null, 'teacher-1')).toEqual({
			isAdmin: false,
			isSiteAdmin: false,
			isStaff: false,
			isTeacher: true,
			isPrivileged: false,
		});
	});

	it('marks admin as privileged', () => {
		expect(resolveAuthRoleFlags('admin', null).isPrivileged).toBe(true);
		expect(resolveAuthRoleFlags('admin', null).isAdmin).toBe(true);
	});
});
