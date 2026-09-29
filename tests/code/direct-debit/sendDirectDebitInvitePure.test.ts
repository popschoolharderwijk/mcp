import { describe, expect, it } from 'bun:test';
import {
	buildDirectDebitInviteRedirectUrl,
	buildDirectDebitInviteSuccessPayload,
	canAccessDirectDebitInviteAgreement,
	hasDirectDebitAgreementRecord,
	isDirectDebitInvitePrivilegedRole,
	resolveDirectDebitAgreementAccessError,
	resolveDirectDebitAgreementInactiveResponse,
	resolveDirectDebitAgreementNotFoundResponse,
	resolveDirectDebitInviteForbiddenResponse,
	resolveDirectDebitInviteMissingEmailResponse,
	resolveDirectDebitInviteRecipient,
} from '../../../supabase/functions/send-direct-debit-invite/sendDirectDebitInvitePure';

const AGREEMENT_ID = '11111111-1111-1111-1111-111111111111';
const STUDENT_ID = '22222222-2222-2222-2222-222222222222';
const OTHER_USER_ID = '33333333-3333-3333-3333-333333333333';

describe('isDirectDebitInvitePrivilegedRole', () => {
	it('returns true for admin, site_admin and teacher roles', () => {
		expect(isDirectDebitInvitePrivilegedRole('admin')).toBe(true);
		expect(isDirectDebitInvitePrivilegedRole('site_admin')).toBe(true);
		expect(isDirectDebitInvitePrivilegedRole('teacher')).toBe(true);
	});

	it('returns false for student and missing roles', () => {
		expect(isDirectDebitInvitePrivilegedRole('student')).toBe(false);
		expect(isDirectDebitInvitePrivilegedRole(null)).toBe(false);
	});
});

describe('canAccessDirectDebitInviteAgreement', () => {
	it('allows privileged users to access any agreement', () => {
		expect(canAccessDirectDebitInviteAgreement(true, STUDENT_ID, OTHER_USER_ID)).toBe(true);
	});

	it('allows the student owner to access their own agreement', () => {
		expect(canAccessDirectDebitInviteAgreement(false, STUDENT_ID, STUDENT_ID)).toBe(true);
	});

	it('denies non-privileged users for other students', () => {
		expect(canAccessDirectDebitInviteAgreement(false, STUDENT_ID, OTHER_USER_ID)).toBe(false);
	});
});

describe('buildDirectDebitInviteRedirectUrl', () => {
	it('builds the incasso start redirect url', () => {
		expect(buildDirectDebitInviteRedirectUrl('https://app.example.com', AGREEMENT_ID)).toBe(
			`https://app.example.com/direct-debit/start?agreement=${AGREEMENT_ID}`,
		);
	});
});

describe('resolveDirectDebitInviteRecipient', () => {
	it('returns the profile email when present', () => {
		expect(resolveDirectDebitInviteRecipient('student@example.com')).toBe('student@example.com');
	});

	it('returns null when the profile email is missing', () => {
		expect(resolveDirectDebitInviteRecipient(null)).toBeNull();
	});
});

describe('resolveDirectDebitAgreementNotFoundResponse', () => {
	it('returns the not found payload', () => {
		expect(resolveDirectDebitAgreementNotFoundResponse()).toEqual({
			status: 404,
			error: 'Overeenkomst niet gevonden',
		});
	});
});

describe('resolveDirectDebitAgreementAccessError', () => {
	const agreement = {
		id: AGREEMENT_ID,
		student_user_id: STUDENT_ID,
		is_active: true,
	};

	it('returns ok when access is allowed', () => {
		expect(resolveDirectDebitAgreementAccessError(agreement, null, true, OTHER_USER_ID)).toEqual({
			ok: true,
			agreement,
		});
	});

	it('returns not found when agreement is missing', () => {
		expect(resolveDirectDebitAgreementAccessError(null, null, true, OTHER_USER_ID)).toEqual({
			ok: false,
			status: 404,
			error: 'Overeenkomst niet gevonden',
		});
	});

	it('returns inactive when agreement is not active', () => {
		expect(
			resolveDirectDebitAgreementAccessError({ ...agreement, is_active: false }, null, true, OTHER_USER_ID),
		).toEqual({
			ok: false,
			status: 409,
			error: 'Overeenkomst is niet actief',
		});
	});

	it('returns forbidden for non-privileged users on other students', () => {
		expect(resolveDirectDebitAgreementAccessError(agreement, null, false, OTHER_USER_ID)).toEqual({
			ok: false,
			status: 403,
			error: 'Geen rechten',
		});
	});
});

describe('resolveDirectDebitAgreementInactiveResponse', () => {
	it('returns the inactive payload', () => {
		expect(resolveDirectDebitAgreementInactiveResponse()).toEqual({
			status: 409,
			error: 'Overeenkomst is niet actief',
		});
	});
});

describe('resolveDirectDebitInviteForbiddenResponse', () => {
	it('returns the forbidden payload', () => {
		expect(resolveDirectDebitInviteForbiddenResponse()).toEqual({ status: 403, error: 'Geen rechten' });
	});
});

describe('resolveDirectDebitInviteMissingEmailResponse', () => {
	it('returns the missing email payload', () => {
		expect(resolveDirectDebitInviteMissingEmailResponse()).toEqual({
			status: 422,
			error: 'Geen e-mailadres bekend voor leerling',
		});
	});
});

describe('buildDirectDebitInviteSuccessPayload', () => {
	it('returns the success payload', () => {
		expect(buildDirectDebitInviteSuccessPayload('student@example.com')).toEqual({
			ok: true,
			recipient: 'student@example.com',
		});
	});
});

describe('hasDirectDebitAgreementRecord', () => {
	it('returns true when agreement exists without error', () => {
		expect(
			hasDirectDebitAgreementRecord({ id: AGREEMENT_ID, student_user_id: STUDENT_ID, is_active: true }, null),
		).toBe(true);
	});

	it('returns false when agreement is missing', () => {
		expect(hasDirectDebitAgreementRecord(null, null)).toBe(false);
	});
});
