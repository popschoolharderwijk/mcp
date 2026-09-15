import { describe, expect, it } from 'bun:test';
import {
	resolveUsersTableInitialSortColumn,
	resolveUsersTableInitialSortDirection,
	resolveUsersTableRowClassName,
	shouldShowUsersCreateButton,
} from '../../../src/lib/users/usersPageTableHelpers';

describe('shouldShowUsersCreateButton', () => {
	it('returns true for admins', () => {
		expect(shouldShowUsersCreateButton(true, false)).toBe(true);
	});

	it('returns true for site admins', () => {
		expect(shouldShowUsersCreateButton(false, true)).toBe(true);
	});

	it('returns false for regular users', () => {
		expect(shouldShowUsersCreateButton(false, false)).toBe(false);
	});
});

describe('resolveUsersTableRowClassName', () => {
	it('highlights the current user row', () => {
		expect(resolveUsersTableRowClassName('user-1', 'user-1')).toBe('bg-accent');
	});

	it('returns undefined for other users', () => {
		expect(resolveUsersTableRowClassName('user-2', 'user-1')).toBeUndefined();
	});
});

describe('resolveUsersTableInitialSortColumn', () => {
	it('returns undefined for null sort column', () => {
		expect(resolveUsersTableInitialSortColumn(null)).toBeUndefined();
	});

	it('returns the sort column when set', () => {
		expect(resolveUsersTableInitialSortColumn('email')).toBe('email');
	});
});

describe('resolveUsersTableInitialSortDirection', () => {
	it('returns undefined for null sort direction', () => {
		expect(resolveUsersTableInitialSortDirection(null)).toBeUndefined();
	});

	it('returns the sort direction when set', () => {
		expect(resolveUsersTableInitialSortDirection('desc')).toBe('desc');
	});
});
