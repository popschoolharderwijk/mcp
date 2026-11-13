import { describe, expect, it } from 'bun:test';
import {
	buildStripeCheckoutInviteRedirectUrl,
	buildStripeCheckoutInviteSuccessPayload,
	canAccessStripeCheckoutInviteAgreement,
	canOverrideStripeCheckoutInviteRecipient,
	hasStripeCheckoutAgreementRecord,
	isStripeCheckoutInviteAdminRole,
	resolveStripeCheckoutAgreementAccessError,
	resolveStripeCheckoutAgreementInactiveResponse,
	resolveStripeCheckoutAgreementNotFoundResponse,
	resolveStripeCheckoutInviteForbiddenResponse,
	resolveStripeCheckoutInviteMissingEmailResponse,
	resolveStripeCheckoutInviteRecipient,
} from '../../../supabase/functions/send-stripe-checkout-invite/sendStripeCheckoutInviteHelpers';

const AGREEMENT_ID = '11111111-1111-1111-1111-111111111111';
const STUDENT_ID = '22222222-2222-2222-2222-222222222222';
const TEACHER_ID = '44444444-4444-4444-4444-444444444444';
const OTHER_USER_ID = '33333333-3333-3333-3333-333333333333';

describe('isStripeCheckoutInviteAdminRole', () => {
	it('returns true for admin and site_admin only', () => {
		expect(isStripeCheckoutInviteAdminRole('admin')).toBe(true);
		expect(isStripeCheckoutInviteAdminRole('site_admin')).toBe(true);
		expect(isStripeCheckoutInviteAdminRole('teacher')).toBe(false);
		expect(isStripeCheckoutInviteAdminRole('student')).toBe(false);
		expect(isStripeCheckoutInviteAdminRole(null)).toBe(false);
	});
});

describe('canOverrideStripeCheckoutInviteRecipient', () => {
	it('allows admins and the agreement teacher only', () => {
		expect(canOverrideStripeCheckoutInviteRecipient(true, TEACHER_ID, OTHER_USER_ID)).toBe(true);
		expect(canOverrideStripeCheckoutInviteRecipient(false, TEACHER_ID, TEACHER_ID)).toBe(true);
		expect(canOverrideStripeCheckoutInviteRecipient(false, TEACHER_ID, OTHER_USER_ID)).toBe(false);
		expect(canOverrideStripeCheckoutInviteRecipient(false, TEACHER_ID, STUDENT_ID)).toBe(false);
	});
});

describe('canAccessStripeCheckoutInviteAgreement', () => {
	it('allows admins to access any agreement', () => {
		expect(
			canAccessStripeCheckoutInviteAgreement({
				isAdmin: true,
				agreementStudentUserId: STUDENT_ID,
				agreementTeacherUserId: TEACHER_ID,
				requestingUserId: OTHER_USER_ID,
			}),
		).toBe(true);
	});

	it('allows the student owner to access their own agreement', () => {
		expect(
			canAccessStripeCheckoutInviteAgreement({
				isAdmin: false,
				agreementStudentUserId: STUDENT_ID,
				agreementTeacherUserId: TEACHER_ID,
				requestingUserId: STUDENT_ID,
			}),
		).toBe(true);
	});

	it('allows the agreement teacher to access their own agreement', () => {
		expect(
			canAccessStripeCheckoutInviteAgreement({
				isAdmin: false,
				agreementStudentUserId: STUDENT_ID,
				agreementTeacherUserId: TEACHER_ID,
				requestingUserId: TEACHER_ID,
			}),
		).toBe(true);
	});

	it('denies another teacher for a student they do not teach', () => {
		expect(
			canAccessStripeCheckoutInviteAgreement({
				isAdmin: false,
				agreementStudentUserId: STUDENT_ID,
				agreementTeacherUserId: TEACHER_ID,
				requestingUserId: OTHER_USER_ID,
			}),
		).toBe(false);
	});
});

describe('buildStripeCheckoutInviteRedirectUrl', () => {
	it('builds the Stripe checkout start redirect url', () => {
		expect(buildStripeCheckoutInviteRedirectUrl('https://app.example.com', AGREEMENT_ID)).toBe(
			`https://app.example.com/stripe/checkout/start?agreement=${AGREEMENT_ID}`,
		);
	});
});

describe('resolveStripeCheckoutInviteRecipient', () => {
	it('returns the profile email when present', () => {
		expect(resolveStripeCheckoutInviteRecipient('student@example.com')).toBe('student@example.com');
	});

	it('returns null when the profile email is missing', () => {
		expect(resolveStripeCheckoutInviteRecipient(null)).toBeNull();
	});
});

describe('resolveStripeCheckoutAgreementNotFoundResponse', () => {
	it('returns the not found payload', () => {
		expect(resolveStripeCheckoutAgreementNotFoundResponse()).toEqual({
			status: 404,
			error: 'Overeenkomst niet gevonden',
		});
	});
});

describe('resolveStripeCheckoutAgreementAccessError', () => {
	const agreement = {
		id: AGREEMENT_ID,
		student_user_id: STUDENT_ID,
		teacher_user_id: TEACHER_ID,
		is_active: true,
	};

	it('returns ok when admin access is allowed', () => {
		expect(resolveStripeCheckoutAgreementAccessError(agreement, null, true, OTHER_USER_ID)).toEqual({
			ok: true,
			agreement,
		});
	});

	it('returns ok when the agreement teacher requests access', () => {
		expect(resolveStripeCheckoutAgreementAccessError(agreement, null, false, TEACHER_ID)).toEqual({
			ok: true,
			agreement,
		});
	});

	it('returns not found when agreement is missing', () => {
		expect(resolveStripeCheckoutAgreementAccessError(null, null, true, OTHER_USER_ID)).toEqual({
			ok: false,
			status: 404,
			error: 'Overeenkomst niet gevonden',
		});
	});

	it('returns inactive when agreement is not active', () => {
		expect(
			resolveStripeCheckoutAgreementAccessError({ ...agreement, is_active: false }, null, true, OTHER_USER_ID),
		).toEqual({
			ok: false,
			status: 409,
			error: 'Overeenkomst is niet actief',
		});
	});

	it('returns forbidden for another teacher on a student they do not teach', () => {
		expect(resolveStripeCheckoutAgreementAccessError(agreement, null, false, OTHER_USER_ID)).toEqual({
			ok: false,
			status: 403,
			error: 'Geen rechten',
		});
	});
});

describe('resolveStripeCheckoutAgreementInactiveResponse', () => {
	it('returns the inactive payload', () => {
		expect(resolveStripeCheckoutAgreementInactiveResponse()).toEqual({
			status: 409,
			error: 'Overeenkomst is niet actief',
		});
	});
});

describe('resolveStripeCheckoutInviteForbiddenResponse', () => {
	it('returns the forbidden payload', () => {
		expect(resolveStripeCheckoutInviteForbiddenResponse()).toEqual({ status: 403, error: 'Geen rechten' });
	});
});

describe('resolveStripeCheckoutInviteMissingEmailResponse', () => {
	it('returns the missing email payload', () => {
		expect(resolveStripeCheckoutInviteMissingEmailResponse()).toEqual({
			status: 422,
			error: 'Geen e-mailadres bekend voor leerling',
		});
	});
});

describe('buildStripeCheckoutInviteSuccessPayload', () => {
	it('returns the success payload', () => {
		expect(buildStripeCheckoutInviteSuccessPayload('student@example.com')).toEqual({
			ok: true,
			recipient: 'student@example.com',
		});
	});
});

describe('hasStripeCheckoutAgreementRecord', () => {
	it('returns true when agreement exists without error', () => {
		expect(
			hasStripeCheckoutAgreementRecord(
				{
					id: AGREEMENT_ID,
					student_user_id: STUDENT_ID,
					teacher_user_id: TEACHER_ID,
					is_active: true,
				},
				null,
			),
		).toBe(true);
	});

	it('returns false when agreement is missing', () => {
		expect(hasStripeCheckoutAgreementRecord(null, null)).toBe(false);
	});
});
