import { afterEach, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

let roleResult: { data: unknown; error: null } = { data: [], error: null };
let profileResult: { data: unknown; error: null } = { data: [], error: null };

mock.module('../../../src/integrations/supabase/client', () => ({
	supabase: {
		from: (table: string) => ({
			select: () => ({
				eq: () => ({
					limit: () => Promise.resolve(table === 'user_roles' ? roleResult : profileResult),
				}),
			}),
		}),
	},
}));

describe('fetchUserRoleAndProfile', () => {
	let fetchUserRoleAndProfile: typeof import('../../../src/lib/layout/topNavProfile').fetchUserRoleAndProfile;

	beforeAll(async () => {
		({ fetchUserRoleAndProfile } = await import('../../../src/lib/layout/topNavProfile'));
	});

	beforeEach(() => {
		roleResult = { data: [], error: null };
		profileResult = { data: [], error: null };
	});

	afterEach(() => {
		mock.restore();
	});

	it('returns null role and profile when both queries are empty', async () => {
		expect(await fetchUserRoleAndProfile('login-1', 'profile-1')).toEqual({
			role: null,
			profile: null,
		});
	});

	it('returns role for login and profile for active person', async () => {
		roleResult = { data: [{ role: 'admin' }], error: null };
		profileResult = {
			data: [{ first_name: 'Emma', last_name: 'de Vries', avatar_url: null }],
			error: null,
		};
		expect(await fetchUserRoleAndProfile('login-1', 'profile-1')).toEqual({
			role: 'admin',
			profile: { first_name: 'Emma', last_name: 'de Vries', avatar_url: null },
		});
	});
});
