import { describe, expect, it } from 'bun:test';
import {
	buildStripeCheckoutInviteRedirectUrl,
	buildStripeCheckoutInviteSuccessPayload,
	canAccessStripeCheckoutInviteAgreement,
	hasStripeCheckoutAgreementRecord,
	isStripeCheckoutInvitePrivilegedRole,
	resolveStripeCheckoutAgreementAccessError,
	resolveStripeCheckoutAgreementInactiveResponse,
	resolveStripeCheckoutAgreementNotFoundResponse,
	resolveStripeCheckoutInviteForbiddenResponse,
	resolveStripeCheckoutInviteMissingEmailResponse,
	resolveStripeCheckoutInviteRecipient,
} from '../../../supabase/functions/send-stripe-checkout-invite/sendStripeCheckoutInviteHelpers';

const AGREEMENT_ID = '11111111-1111-1111-1111-111111111111';
const STUDENT_ID = '22222222-2222-2222-2222-222222222222';
const OTHER_USER_ID = '33333333-3333-3333-3333-333333333333';

describe('isStripeCheckoutInvitePrivilegedRole', () => {
	it('returns true for admin, site_admin and teacher roles', () => {
		expect(isStripeCheckoutInvitePrivilegedRole('admin')).toBe(true);
		expect(isStripeCheckoutInvitePrivilegedRole('site_admin')).toBe(true);
		expect(isStripeCheckoutInvitePrivilegedRole('teacher')).toBe(true);
	});

	it('returns false for student and missing roles', () => {
		expect(isStripeCheckoutInvitePrivilegedRole('student')).toBe(false);
		expect(isStripeCheckoutInvitePrivilegedRole(null)).toBe(false);
	});
});

describe('canAccessStripeCheckoutInviteAgreement', () => {
	it('allows privileged users to access any agreement', () => {
		expect(canAccessStripeCheckoutInviteAgreement(true, STUDENT_ID, OTHER_USER_ID)).toBe(true);
	});

	it('allows the student owner to access their own agreement', () => {
		expect(canAccessStripeCheckoutInviteAgreement(false, STUDENT_ID, STUDENT_ID)).toBe(true);
	});

	it('denies non-privileged users for other students', () => {
		expect(canAccessStripeCheckoutInviteAgreement(false, STUDENT_ID, OTHER_USER_ID)).toBe(false);
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
		is_active: true,
	};

	it('returns ok when access is allowed', () => {
		expect(resolveStripeCheckoutAgreementAccessError(agreement, null, true, OTHER_USER_ID)).toEqual({
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

	it('returns forbidden for non-privileged users on other students', () => {
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
			hasStripeCheckoutAgreementRecord({ id: AGREEMENT_ID, student_user_id: STUDENT_ID, is_active: true }, null),
		).toBe(true);
	});

	it('returns false when agreement is missing', () => {
		expect(hasStripeCheckoutAgreementRecord(null, null)).toBe(false);
	});
});
