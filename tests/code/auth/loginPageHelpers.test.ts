import { describe, expect, it } from 'bun:test';
import {
	buildMagicLinkSignInOptions,
	resolveLoginPageContent,
	resolveLoginViewMode,
} from '../../../src/lib/auth/loginPageHelpers';

describe('buildMagicLinkSignInOptions', () => {
	it('disables user creation and sets redirect url', () => {
		expect(buildMagicLinkSignInOptions('https://app.example.com')).toEqual({
			shouldCreateUser: false,
			emailRedirectTo: 'https://app.example.com/auth/callback',
		});
	});
});

describe('resolveLoginViewMode', () => {
	it('returns magic-link mode for idle, sending, and passkey states', () => {
		expect(resolveLoginViewMode('idle')).toBe('magic-link');
		expect(resolveLoginViewMode('sending')).toBe('magic-link');
		expect(resolveLoginViewMode('passkey')).toBe('magic-link');
	});

	it('returns otp mode after the link is sent', () => {
		expect(resolveLoginViewMode('sent')).toBe('otp');
	});
});

describe('resolveLoginPageContent', () => {
	it('returns redirect when user should redirect', () => {
		expect(resolveLoginPageContent(true, false)).toBe('redirect');
	});

	it('returns loading when auth is loading', () => {
		expect(resolveLoginPageContent(false, true)).toBe('loading');
	});

	it('returns form when user can sign in', () => {
		expect(resolveLoginPageContent(false, false)).toBe('form');
	});
});
