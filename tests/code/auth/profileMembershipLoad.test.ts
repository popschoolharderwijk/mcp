import { afterEach, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

let membershipsResult: { data: unknown; error: { message: string } | null } = { data: [], error: null };
let profilesResult: { data: unknown; error: { message: string } | null } = { data: [], error: null };
let switchError: { message: string } | null = null;
let refreshResult: { data: { session: unknown }; error: { message: string } | null } = {
	data: { session: null },
	error: null,
};
let lastSwitchBody: unknown = null;

mock.module('../../../src/integrations/supabase/client', () => ({
	supabase: {
		from: (table: string) => ({
			select: () => ({
				eq: () => Promise.resolve(membershipsResult),
				in: () => Promise.resolve(table === 'profiles' ? profilesResult : membershipsResult),
			}),
		}),
		functions: {
			invoke: (_name: string, options: { body: unknown }) => {
				lastSwitchBody = options.body;
				return Promise.resolve({ data: null, error: switchError });
			},
		},
		auth: {
			refreshSession: () => Promise.resolve(refreshResult),
		},
	},
}));

describe('loadMembershipProfiles', () => {
	let loadMembershipProfiles: typeof import('../../../src/hooks/useAuthProviderState').loadMembershipProfiles;

	beforeAll(async () => {
		({ loadMembershipProfiles } = await import('../../../src/hooks/useAuthProviderState'));
	});

	beforeEach(() => {
		membershipsResult = { data: [], error: null };
		profilesResult = { data: [], error: null };
	});

	afterEach(() => {
		mock.restore();
	});

	it('returns empty when memberships query fails', async () => {
		membershipsResult = { data: null, error: { message: 'fail' } };
		expect(await loadMembershipProfiles('login-1')).toEqual([]);
	});

	it('returns empty when there are no memberships', async () => {
		membershipsResult = { data: [], error: null };
		expect(await loadMembershipProfiles('login-1')).toEqual([]);
	});

	it('returns empty when profiles query fails', async () => {
		membershipsResult = { data: [{ profile_id: 'p1', role: 'owner' }], error: null };
		profilesResult = { data: null, error: { message: 'profiles fail' } };
		expect(await loadMembershipProfiles('login-1')).toEqual([]);
	});

	it('joins memberships with profile display fields', async () => {
		membershipsResult = {
			data: [
				{ profile_id: 'p1', role: 'owner' },
				{ profile_id: 'p2', role: 'member' },
			],
			error: null,
		};
		profilesResult = {
			data: [
				{ user_id: 'p1', first_name: 'Karin', last_name: 'de Vries', avatar_url: null },
				{ user_id: 'p2', first_name: 'Emma', last_name: 'de Vries', avatar_url: null },
			],
			error: null,
		};
		expect(await loadMembershipProfiles('login-1')).toEqual([
			{
				profileId: 'p1',
				role: 'owner',
				firstName: 'Karin',
				lastName: 'de Vries',
				avatarUrl: null,
				displayName: 'Karin de Vries',
			},
			{
				profileId: 'p2',
				role: 'member',
				firstName: 'Emma',
				lastName: 'de Vries',
				avatarUrl: null,
				displayName: 'Emma de Vries',
			},
		]);
	});
});

describe('applyAuthenticatedSession', () => {
	let applyAuthenticatedSession: typeof import('../../../src/hooks/useAuthProviderState').applyAuthenticatedSession;

	beforeAll(async () => {
		({ applyAuthenticatedSession } = await import('../../../src/hooks/useAuthProviderState'));
	});

	beforeEach(() => {
		membershipsResult = { data: [], error: null };
		profilesResult = { data: [], error: null };
	});

	afterEach(() => {
		mock.restore();
	});

	it('clears auth state when session is missing', async () => {
		const calls: string[] = [];
		await applyAuthenticatedSession({
			nextSession: null,
			options: { resetProfileSelection: true, clearOnLogout: true },
			suppressSelectionReset: false,
			fetchRole: async () => null,
			fetchTeacher: async () => null,
			clearRoleState: () => {
				calls.push('clear');
			},
			completeLoading: () => {
				calls.push('complete');
			},
			markUnavailable: () => {
				calls.push('unavailable');
			},
			setSession: () => {
				calls.push('session');
			},
			setUser: () => {
				calls.push('user');
			},
			setActiveProfileId: () => {
				calls.push('active');
			},
			setMembershipProfiles: () => {
				calls.push('memberships');
			},
			setProfileSelectionCompletedThisSession: () => {
				calls.push('selection');
			},
		});
		expect(calls).toEqual(['session', 'user', 'active', 'memberships', 'selection', 'clear', 'complete']);
	});

	it('loads memberships and keeps selection when suppress reset is set', async () => {
		membershipsResult = { data: [{ profile_id: 'p1', role: 'owner' }], error: null };
		profilesResult = {
			data: [{ user_id: 'p1', first_name: 'Karin', last_name: 'de Vries', avatar_url: null }],
			error: null,
		};
		let selectionReset = false;
		let membershipCount = -1;
		await applyAuthenticatedSession({
			nextSession: { user: { id: 'login-1' } } as never,
			options: { resetProfileSelection: true, clearOnLogout: false },
			suppressSelectionReset: true,
			fetchRole: async () => null,
			fetchTeacher: async () => null,
			clearRoleState: () => {},
			completeLoading: () => {},
			markUnavailable: () => {},
			setSession: () => {},
			setUser: () => {},
			setActiveProfileId: () => {},
			setMembershipProfiles: (profiles) => {
				membershipCount = profiles.length;
			},
			setProfileSelectionCompletedThisSession: () => {
				selectionReset = true;
			},
		});
		expect(membershipCount).toBe(1);
		expect(selectionReset).toBe(false);
	});
});

describe('switchAndRefreshSession', () => {
	let switchAndRefreshSession: typeof import('../../../src/hooks/useAuthProviderState').switchAndRefreshSession;

	beforeAll(async () => {
		({ switchAndRefreshSession } = await import('../../../src/hooks/useAuthProviderState'));
	});

	beforeEach(() => {
		switchError = null;
		refreshResult = { data: { session: null }, error: null };
		lastSwitchBody = null;
	});

	afterEach(() => {
		mock.restore();
	});

	it('marks non-auth switch failures without sign-out', async () => {
		switchError = { message: 'Edge Function returned a non-2xx status code', context: { status: 403 } };
		expect(await switchAndRefreshSession('p1')).toEqual({ ok: false, shouldSignOut: false });
		expect(lastSwitchBody).toEqual({ profile_id: 'p1' });
	});

	it('marks switch-profile 401 as requiring sign-out', async () => {
		switchError = { message: 'Edge Function returned a non-2xx status code', context: { status: 401 } };
		expect(await switchAndRefreshSession('p1')).toEqual({ ok: false, shouldSignOut: true });
	});

	it('marks refresh failures as requiring sign-out', async () => {
		refreshResult = { data: { session: null }, error: { message: 'refresh failed' } };
		expect(await switchAndRefreshSession('p1')).toEqual({ ok: false, shouldSignOut: true });
	});

	it('returns the refreshed session after a successful switch', async () => {
		const session = { user: { id: 'login-1', app_metadata: { active_profile_id: 'p1' } } };
		refreshResult = { data: { session }, error: null };
		expect(await switchAndRefreshSession('p1')).toEqual({ ok: true, session: session as never });
	});
});
