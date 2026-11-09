import { describe, expect, it } from 'bun:test';
import {
	canSubmitOtp,
	isLoginSendingState,
	sanitizeOtpInput,
	shouldAutoSendMagicLink,
	shouldRedirectLoggedInUser,
} from '../../../src/lib/auth/loginHelpers';

describe('shouldAutoSendMagicLink', () => {
	it('returns true when prefilled email exists and user is not logged in', () => {
		expect(shouldAutoSendMagicLink(false, false, false, 'jan@test.nl')).toBe(true);
	});

	it('returns false when already sent', () => {
		expect(shouldAutoSendMagicLink(true, false, false, 'jan@test.nl')).toBe(false);
	});
});

describe('shouldRedirectLoggedInUser', () => {
	it('returns true when auth is loaded and user exists', () => {
		expect(shouldRedirectLoggedInUser(false, true)).toBe(true);
	});
});

describe('isLoginSendingState', () => {
	it('returns true for idle, sending, and passkey states', () => {
		expect(isLoginSendingState('idle')).toBe(true);
		expect(isLoginSendingState('sending')).toBe(true);
		expect(isLoginSendingState('passkey')).toBe(true);
		expect(isLoginSendingState('sent')).toBe(false);
	});
});

describe('sanitizeOtpInput', () => {
	it('removes non-digits', () => {
		expect(sanitizeOtpInput('12ab34')).toBe('1234');
	});
});

describe('canSubmitOtp', () => {
	it('requires at least six digits', () => {
		expect(canSubmitOtp('sent', 6)).toBe(true);
		expect(canSubmitOtp('sent', 5)).toBe(false);
	});
});
