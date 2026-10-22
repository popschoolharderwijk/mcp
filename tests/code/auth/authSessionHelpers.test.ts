import { describe, expect, it } from 'bun:test';
import {
	isAuthBackendUnreachableError,
	planAuthSessionApply,
	resolveAuthBootstrapProbeOutcome,
	resolveAuthRoleFlags,
	runAuthSessionSideEffects,
} from '../../../src/lib/auth/authSessionHelpers';

describe('planAuthSessionApply', () => {
	it('plans role fetch when session has a user', () => {
		expect(planAuthSessionApply({ user: { id: 'user-1' } } as never, false)).toEqual({
			userId: 'user-1',
			shouldFetchRoleAndTeacher: true,
			shouldClearRoleOnLogout: false,
		});
	});

	it('clears role on logout when session is missing', () => {
		expect(planAuthSessionApply(null, true)).toEqual({
			userId: null,
			shouldFetchRoleAndTeacher: false,
			shouldClearRoleOnLogout: true,
		});
	});

	it('does not clear role when initial session is missing', () => {
		expect(planAuthSessionApply(null, false)).toEqual({
			userId: null,
			shouldFetchRoleAndTeacher: false,
			shouldClearRoleOnLogout: false,
		});
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

	it('signals unavailable when a probe cannot reach the backend', async () => {
		let completed = false;
		let unavailable = false;
		runAuthSessionSideEffects({
			plan: {
				userId: 'user-1',
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
		expect(completed).toBe(true);
	});

	it('signals unavailable when a probe throws', async () => {
		let completed = false;
		let unavailable = false;
		runAuthSessionSideEffects({
			plan: {
				userId: 'user-1',
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
		expect(completed).toBe(true);
	});

	it('clears role state on logout', () => {
		let cleared = false;
		let completed = false;
		runAuthSessionSideEffects({
			plan: {
				userId: null,
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
