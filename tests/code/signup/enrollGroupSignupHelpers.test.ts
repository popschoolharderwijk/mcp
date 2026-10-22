import { describe, expect, it } from 'bun:test';
import {
	buildGroupSignupApprovalUpdate,
	isDuplicateMemberInsertError,
	resolveCreatedAgreementId,
	resolveMemberInsertFailure,
} from '../../../supabase/functions/approve-signup-request/enrollGroupSignupHelpers';

describe('isDuplicateMemberInsertError', () => {
	it('returns true for duplicate key errors', () => {
		expect(isDuplicateMemberInsertError('duplicate key value violates unique constraint')).toBe(true);
	});

	it('returns false for other errors', () => {
		expect(isDuplicateMemberInsertError('insert failed')).toBe(false);
	});
});

describe('resolveMemberInsertFailure', () => {
	it('returns null for duplicate member insert errors', () => {
		expect(resolveMemberInsertFailure('duplicate key value violates unique constraint')).toBeNull();
	});

	it('returns error response payload for other insert failures', () => {
		expect(resolveMemberInsertFailure('insert failed')).toEqual({
			status: 500,
			error: 'Kon leerling niet aan groep toevoegen',
		});
	});
});

describe('resolveCreatedAgreementId', () => {
	it('returns agreement id when present', () => {
		expect(resolveCreatedAgreementId({ id: 'agr-1' })).toBe('agr-1');
	});

	it('returns null when agreement is missing', () => {
		expect(resolveCreatedAgreementId(null)).toBeNull();
	});
});

describe('buildGroupSignupApprovalUpdate', () => {
	it('builds approved signup request update payload', () => {
		expect(
			buildGroupSignupApprovalUpdate({
				processedBy: 'admin-1',
				processedAt: '2026-07-17T10:00:00.000Z',
				createdAgreementId: 'agr-1',
				targetGroupId: 'group-1',
			}),
		).toEqual({
			status: 'approved',
			processed_by: 'admin-1',
			processed_at: '2026-07-17T10:00:00.000Z',
			created_agreement_id: 'agr-1',
			lesson_group_id: 'group-1',
		});
	});
});
