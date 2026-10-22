import { describe, expect, it } from 'bun:test';
import {
	buildApproveSignupSuccessPayload,
	resolveApproveSignupStatus,
	resolveTargetGroupId,
} from '../../../supabase/functions/approve-signup-request/approveSignupRequestHelpers';

const GROUP_ID = '11111111-1111-1111-1111-111111111111';
const OVERRIDE_GROUP_ID = '22222222-2222-2222-2222-222222222222';
const STUDENT_ID = '33333333-3333-3333-3333-333333333333';
const AGREEMENT_ID = '44444444-4444-4444-4444-444444444444';

describe('resolveTargetGroupId', () => {
	it('returns the override group id when provided', () => {
		expect(resolveTargetGroupId(OVERRIDE_GROUP_ID, GROUP_ID)).toBe(OVERRIDE_GROUP_ID);
	});

	it('returns the request group id when no override is provided', () => {
		expect(resolveTargetGroupId(null, GROUP_ID)).toBe(GROUP_ID);
	});
});

describe('resolveApproveSignupStatus', () => {
	it('returns approved when a target group id exists', () => {
		expect(resolveApproveSignupStatus(GROUP_ID)).toBe('approved');
	});

	it('returns pending when no target group id exists', () => {
		expect(resolveApproveSignupStatus(null)).toBe('pending');
	});
});

describe('buildApproveSignupSuccessPayload', () => {
	it('builds the approve signup success payload for group enrollments', () => {
		expect(
			buildApproveSignupSuccessPayload({
				studentUserId: STUDENT_ID,
				createdAgreementId: AGREEMENT_ID,
				targetGroupId: GROUP_ID,
			}),
		).toEqual({
			student_user_id: STUDENT_ID,
			created_agreement_id: AGREEMENT_ID,
			status: 'approved',
		});
	});

	it('builds the approve signup success payload for individual requests', () => {
		expect(
			buildApproveSignupSuccessPayload({
				studentUserId: STUDENT_ID,
				createdAgreementId: null,
				targetGroupId: null,
			}),
		).toEqual({
			student_user_id: STUDENT_ID,
			created_agreement_id: null,
			status: 'pending',
		});
	});
});
