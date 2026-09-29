import { afterAll, beforeEach, describe, expect, it, mock } from 'bun:test';
import { fetchUsersPage, runUserDelete } from '../../../src/lib/users/usersPageControllerHelpers';
import type { UserWithRole } from '../../../src/lib/users/usersPageHelpers';

mock.module('sonner', () => ({
	toast: {
		error: () => {},
		success: () => {},
	},
}));

afterAll(() => {
	mock.restore();
});

describe('fetchUsersPage', () => {
	it('skips loading when user has no access', async () => {
		let loading = true;
		await fetchUsersPage({
			hasAccess: false,
			currentPage: 1,
			rowsPerPage: 10,
			debouncedSearchQuery: '',
			selectedRole: null,
			sortColumn: null,
			sortDirection: null,
			supabase: { rpc: async () => ({ data: null, error: null }) } as never,
			setLoading: (value) => {
				loading = value;
			},
			setTotalCount: () => {},
			setUsers: () => {},
		});
		expect(loading).toBe(true);
	});

	it('loads users and total count on success', async () => {
		let loading = true;
		let totalCount = 0;
		let users: UserWithRole[] = [];
		await fetchUsersPage({
			hasAccess: true,
			currentPage: 1,
			rowsPerPage: 10,
			debouncedSearchQuery: '',
			selectedRole: null,
			sortColumn: null,
			sortDirection: null,
			supabase: {
				rpc: async () => ({
					data: {
						data: [
							{
								user_id: 'user-1',
								email: 'anna@example.com',
								first_name: 'Anna',
								last_name: 'Bakker',
								phone_number: null,
								avatar_url: null,
								created_at: '2026-01-01T00:00:00Z',
								last_sign_in_at: '2026-01-15T12:00:00Z',
								role: 'staff',
							},
						],
						total_count: 1,
					},
					error: null,
				}),
			} as never,
			setLoading: (value) => {
				loading = value;
			},
			setTotalCount: (count) => {
				totalCount = count;
			},
			setUsers: (nextUsers) => {
				users = nextUsers;
			},
		});
		expect(loading).toBe(false);
		expect(totalCount).toBe(1);
		expect(users).toEqual([
			{
				user_id: 'user-1',
				email: 'anna@example.com',
				first_name: 'Anna',
				last_name: 'Bakker',
				phone_number: null,
				avatar_url: null,
				created_at: '2026-01-01T00:00:00Z',
				last_sign_in_at: '2026-01-15T12:00:00Z',
				role: 'staff',
			},
		]);
	});

	it('stops loading after rpc failure', async () => {
		let loading = true;
		await fetchUsersPage({
			hasAccess: true,
			currentPage: 1,
			rowsPerPage: 10,
			debouncedSearchQuery: '',
			selectedRole: null,
			sortColumn: null,
			sortDirection: null,
			supabase: {
				rpc: async () => ({ data: null, error: { message: 'rpc failed' } }),
			} as never,
			setLoading: (value) => {
				loading = value;
			},
			setTotalCount: () => {},
			setUsers: () => {},
		});
		expect(loading).toBe(false);
	});
});

describe('runUserDelete', () => {
	const user = {
		user_id: 'user-1',
		email: 'anna@example.com',
		first_name: 'Anna',
		last_name: 'Bakker',
		phone_number: null,
		avatar_url: null,
		created_at: '2026-01-01T00:00:00Z',
		last_sign_in_at: null,
		role: 'staff' as const,
	};

	beforeEach(() => {});

	it('clears dialog and reloads users on success', async () => {
		let dialogOpen = true;
		let reloaded = false;
		await runUserDelete({
			user,
			isSiteAdmin: false,
			supabase: {
				functions: {
					invoke: async () => ({ data: {}, error: null }),
				},
			} as never,
			setDeleteDialog: () => {
				dialogOpen = false;
			},
			loadUsers: async () => {
				reloaded = true;
			},
		});
		expect(dialogOpen).toBe(false);
		expect(reloaded).toBe(true);
	});

	it('throws on invoke error', async () => {
		await expect(
			runUserDelete({
				user,
				isSiteAdmin: false,
				supabase: {
					functions: {
						invoke: async () => ({ data: null, error: { message: 'network' } }),
					},
				} as never,
				setDeleteDialog: () => {},
				loadUsers: async () => {},
			}),
		).rejects.toThrow('Er is een onbekende fout opgetreden.');
	});

	it('throws on response error', async () => {
		await expect(
			runUserDelete({
				user,
				isSiteAdmin: false,
				supabase: {
					functions: {
						invoke: async () => ({ data: { error: 'forbidden' }, error: null }),
					},
				} as never,
				setDeleteDialog: () => {},
				loadUsers: async () => {},
			}),
		).rejects.toThrow('forbidden');
	});
});
