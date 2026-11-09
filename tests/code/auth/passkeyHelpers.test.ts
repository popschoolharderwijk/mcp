import { describe, expect, it } from 'bun:test';
import {
	canSavePasskeyFriendlyName,
	formatPasskeyTimestamp,
	isPasskeyChallengeExpired,
	isPasskeyUserCancellation,
	NO_PASSKEY_SIGN_IN_MESSAGE,
	normalizePasskeyFriendlyName,
	PASSKEY_INSECURE_ORIGIN_MESSAGE,
	PASSKEY_SESSION_REQUIRED_MESSAGE,
	PASSKEY_UNSUPPORTED_MESSAGE,
	resolveConditionalPasskeySignInOutcome,
	resolveLoginStateAfterPasskeySignIn,
	resolvePasskeyDisplayName,
	resolvePasskeyErrorMessage,
	resolvePasskeyManageOutcome,
	resolvePasskeySignInOutcome,
	resolveUnknownPasskeyError,
} from '../../../src/lib/auth/passkeyHelpers';

describe('resolvePasskeySignInOutcome', () => {
	it('returns success when there is no error', () => {
		expect(resolvePasskeySignInOutcome(null)).toEqual({ kind: 'success' });
	});

	it('explains missing or cancelled passkeys on intentional sign-in', () => {
		expect(
			resolvePasskeySignInOutcome({
				code: 'ERROR_AUTHENTICATOR_GENERAL_ERROR',
				message: 'cancelled',
			}),
		).toEqual({
			kind: 'error',
			message: NO_PASSKEY_SIGN_IN_MESSAGE,
		});
		expect(
			resolvePasskeySignInOutcome({
				name: 'NotAllowedError',
				message: 'denied',
			}),
		).toEqual({
			kind: 'error',
			message: NO_PASSKEY_SIGN_IN_MESSAGE,
		});
	});

	it('explains unsupported browsers on intentional sign-in', () => {
		expect(
			resolvePasskeySignInOutcome({
				name: 'NotSupportedError',
				message: 'unsupported',
			}),
		).toEqual({
			kind: 'error',
			message: PASSKEY_UNSUPPORTED_MESSAGE,
		});
	});

	it('returns a Dutch error message for verification failures', () => {
		expect(
			resolvePasskeySignInOutcome({
				code: 'webauthn_verification_failed',
				message: 'failed',
			}),
		).toEqual({
			kind: 'error',
			message: 'Passkey-verificatie mislukt. Probeer het opnieuw.',
		});
	});
});

describe('resolveConditionalPasskeySignInOutcome', () => {
	it('retries expired challenges and silences every other failure', () => {
		expect(
			resolveConditionalPasskeySignInOutcome({
				code: 'webauthn_challenge_expired',
				message: 'expired',
			}),
		).toEqual({ kind: 'retry' });
		expect(
			resolveConditionalPasskeySignInOutcome({
				code: 'webauthn_verification_failed',
				message: 'failed',
			}),
		).toEqual({ kind: 'silent' });
		expect(
			resolveConditionalPasskeySignInOutcome({
				message: 'boom',
			}),
		).toEqual({ kind: 'silent' });
	});
});

describe('resolvePasskeyManageOutcome', () => {
	it('maps too_many_passkeys to a Dutch manage error', () => {
		expect(
			resolvePasskeyManageOutcome({
				code: 'too_many_passkeys',
				message: 'limit',
			}),
		).toEqual({
			kind: 'error',
			message: 'Je hebt het maximum aantal passkeys bereikt.',
		});
	});

	it('treats authenticator cancel as silent', () => {
		expect(
			resolvePasskeyManageOutcome({
				code: 'ERROR_AUTHENTICATOR_GENERAL_ERROR',
				message: 'cancelled',
			}),
		).toEqual({ kind: 'silent' });
	});

	it('explains missing session and insecure local origins', () => {
		expect(
			resolvePasskeyManageOutcome({
				code: 'session_not_found',
				message: 'Session not found',
			}),
		).toEqual({
			kind: 'error',
			message: PASSKEY_SESSION_REQUIRED_MESSAGE,
		});
		expect(
			resolvePasskeyManageOutcome({
				message: 'Registration failure: Invalid request: insecure protocol',
			}),
		).toEqual({
			kind: 'error',
			message: PASSKEY_INSECURE_ORIGIN_MESSAGE,
		});
		expect(
			resolvePasskeyManageOutcome({
				message: 'Auth session missing!',
			}),
		).toEqual({
			kind: 'error',
			message: PASSKEY_SESSION_REQUIRED_MESSAGE,
		});
	});
});

describe('passkey helper predicates and display', () => {
	it('detects challenge expiry and cancellation codes', () => {
		expect(isPasskeyChallengeExpired({ code: 'webauthn_challenge_expired', message: 'x' })).toBe(true);
		expect(isPasskeyChallengeExpired({ code: 'passkey_disabled', message: 'x' })).toBe(false);
		expect(isPasskeyUserCancellation({ name: 'NotAllowedError', message: 'x' })).toBe(true);
	});

	it('formats and validates friendly names', () => {
		expect(resolvePasskeyDisplayName(undefined)).toBe('Passkey');
		expect(resolvePasskeyDisplayName('  Werk laptop  ')).toBe('Werk laptop');
		expect(normalizePasskeyFriendlyName(`  ${'a'.repeat(130)}  `)).toHaveLength(120);
		expect(canSavePasskeyFriendlyName('')).toBe(false);
		expect(canSavePasskeyFriendlyName('Telefoon')).toBe(true);
	});

	it('formats passkey timestamps and maps thrown errors', () => {
		expect(formatPasskeyTimestamp(undefined, () => 'unused')).toBe('-');
		expect(formatPasskeyTimestamp('2026-01-02T03:04:00.000Z', () => '02-01-2026 04:04')).toBe('02-01-2026 04:04');
		expect(resolveUnknownPasskeyError(new Error('boom'))).toEqual({
			message: 'boom',
			name: 'Error',
			code: undefined,
		});
		expect(resolveUnknownPasskeyError('nope')).toEqual({ message: 'Unknown passkey error' });
	});

	it('keeps passkey busy state after a successful modal sign-in', () => {
		expect(resolveLoginStateAfterPasskeySignIn({ kind: 'success' })).toBe('passkey');
		expect(resolveLoginStateAfterPasskeySignIn({ kind: 'silent' })).toBe('idle');
		expect(resolveLoginStateAfterPasskeySignIn({ kind: 'error', message: 'x' })).toBe('idle');
	});

	it('uses context-specific default error copy', () => {
		expect(resolvePasskeyErrorMessage({ message: 'boom' }, 'sign-in')).toBe(
			'Er ging iets mis bij het inloggen met je passkey.',
		);
		expect(resolvePasskeyErrorMessage({ message: 'boom' }, 'manage')).toBe(
			'Er ging iets mis bij het beheren van je passkey.',
		);
	});
});
