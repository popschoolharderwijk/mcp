import { describe, expect, it } from 'bun:test';
import { canDeleteUserRow, mapUsersSortColumn } from '../../../src/lib/users/usersPageHelpers';

describe('mapUsersSortColumn', () => {
	it('maps known column keys', () => {
		expect(mapUsersSortColumn('user')).toBe('name');
		expect(mapUsersSortColumn('created_at')).toBe('created_at');
		expect(mapUsersSortColumn('last_sign_in_at')).toBe('last_sign_in_at');
	});

	it('falls back to name', () => {
		expect(mapUsersSortColumn(null)).toBe('name');
		expect(mapUsersSortColumn('unknown')).toBe('name');
	});
});

describe('canDeleteUserRow', () => {
	it('blocks deleting the current user', () => {
		expect(canDeleteUserRow('user-1', 'user-1')).toBe(false);
	});

	it('allows deleting other users', () => {
		expect(canDeleteUserRow('user-2', 'user-1')).toBe(true);
	});
});
