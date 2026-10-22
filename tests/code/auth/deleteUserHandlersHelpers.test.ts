import { describe, expect, it } from 'bun:test';
import {
	canDeleteOtherUserAccount,
	isLastSiteAdminDeleteError,
	isSelfDeleteRequest,
	mapDeleteUserPermissionToTarget,
	parseDeleteUserBody,
	resolveDeleteUserPermission,
	resolveDeleteUserRoleFromQuery,
	resolveDeleteUserTargetFromRole,
} from '../../../supabase/functions/delete-user/handlersHelpers';

describe('parseDeleteUserBody', () => {
	it('returns empty object for empty text', () => {
		expect(parseDeleteUserBody('')).toEqual({});
	});

	it('parses valid json body', () => {
		expect(parseDeleteUserBody('{"userId":"user-1"}')).toEqual({ userId: 'user-1' });
	});

	it('returns empty object for invalid json', () => {
		expect(parseDeleteUserBody('not-json')).toEqual({});
	});
});

describe('isSelfDeleteRequest', () => {
	it('returns true when requested user id is missing', () => {
		expect(isSelfDeleteRequest(undefined, 'user-1')).toBe(true);
	});

	it('returns true when requested user id matches requesting user', () => {
		expect(isSelfDeleteRequest('user-1', 'user-1')).toBe(true);
	});

	it('returns false when requested user id differs', () => {
		expect(isSelfDeleteRequest('user-2', 'user-1')).toBe(false);
	});
});

describe('canDeleteOtherUserAccount', () => {
	it('allows admin roles', () => {
		expect(canDeleteOtherUserAccount('admin')).toBe(true);
		expect(canDeleteOtherUserAccount('site_admin')).toBe(true);
	});

	it('denies student role', () => {
		expect(canDeleteOtherUserAccount('student')).toBe(false);
	});
});

describe('resolveDeleteUserPermission', () => {
	it('returns self delete for matching ids', () => {
		expect(resolveDeleteUserPermission('user-1', 'user-1', 'admin')).toEqual({
			kind: 'self',
			targetUserId: 'user-1',
		});
	});

	it('returns other delete for admin deleting another user', () => {
		expect(resolveDeleteUserPermission('admin-1', 'user-2', 'admin')).toEqual({
			kind: 'other',
			targetUserId: 'user-2',
		});
	});

	it('returns forbidden when role cannot be verified', () => {
		expect(resolveDeleteUserPermission('user-1', 'user-2', null)).toEqual({
			kind: 'forbidden',
			targetUserId: 'user-1',
			reason: 'unverified',
		});
	});

	it('returns forbidden when role lacks permission', () => {
		expect(resolveDeleteUserPermission('user-1', 'user-2', 'student')).toEqual({
			kind: 'forbidden',
			targetUserId: 'user-1',
			reason: 'forbidden',
		});
	});
});

describe('isLastSiteAdminDeleteError', () => {
	it('detects last site admin error message', () => {
		expect(isLastSiteAdminDeleteError('Cannot delete last site_admin user')).toBe(true);
	});

	it('returns false for other messages', () => {
		expect(isLastSiteAdminDeleteError('User not found')).toBe(false);
	});
});

describe('mapDeleteUserPermissionToTarget', () => {
	it('maps unverified permission to forbidden response', () => {
		expect(
			mapDeleteUserPermissionToTarget('admin-1', {
				kind: 'forbidden',
				targetUserId: 'admin-1',
				reason: 'unverified',
			}),
		).toEqual({
			targetUserId: 'admin-1',
			error: { status: 403, error: 'Could not verify permissions' },
		});
	});

	it('maps forbidden permission to dutch error response', () => {
		expect(
			mapDeleteUserPermissionToTarget('admin-1', {
				kind: 'forbidden',
				targetUserId: 'admin-1',
				reason: 'forbidden',
			}),
		).toEqual({
			targetUserId: 'admin-1',
			error: { status: 403, error: 'Je hebt geen rechten om andere accounts te verwijderen.' },
		});
	});

	it('maps allowed delete to target user id without error', () => {
		expect(
			mapDeleteUserPermissionToTarget('admin-1', {
				kind: 'other',
				targetUserId: 'user-2',
			}),
		).toEqual({
			targetUserId: 'user-2',
			error: null,
		});
	});
});

describe('resolveDeleteUserRoleFromQuery', () => {
	it('returns role when query succeeds', () => {
		expect(resolveDeleteUserRoleFromQuery({ role: 'admin' }, null)).toBe('admin');
	});

	it('returns null when query fails', () => {
		expect(resolveDeleteUserRoleFromQuery(null, { message: 'missing' })).toBeNull();
	});
});

describe('resolveDeleteUserTargetFromRole', () => {
	it('returns self target for matching user ids', () => {
		expect(resolveDeleteUserTargetFromRole('user-1', 'user-1', 'student')).toEqual({
			targetUserId: 'user-1',
			error: null,
		});
	});

	it('returns forbidden response when role cannot be verified', () => {
		expect(resolveDeleteUserTargetFromRole('admin-1', 'user-2', null)).toEqual({
			targetUserId: 'admin-1',
			error: { status: 403, error: 'Could not verify permissions' },
		});
	});
});
