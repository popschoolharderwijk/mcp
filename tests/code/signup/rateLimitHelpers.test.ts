import { describe, expect, it } from 'bun:test';
import {
	isSignupEmailRateLimited,
	isSignupIpRateLimited,
	normalizeSignupRateLimitEmail,
	resolveSignupClientIp,
	SIGNUP_SUBMITS_PER_EMAIL_PER_HOUR,
	SIGNUP_SUBMITS_PER_IP_PER_HOUR,
	shouldEnforceSignupIpRateLimit,
} from '../../../supabase/functions/submit-signup-request/rateLimitHelpers';

describe('signup rate limit helpers', () => {
	it('normalizes recipient emails', () => {
		expect(normalizeSignupRateLimitEmail('  Anna@Example.com ')).toBe('anna@example.com');
	});

	it('rate limits email submits at the configured threshold', () => {
		expect(isSignupEmailRateLimited(SIGNUP_SUBMITS_PER_EMAIL_PER_HOUR - 1)).toBe(false);
		expect(isSignupEmailRateLimited(SIGNUP_SUBMITS_PER_EMAIL_PER_HOUR)).toBe(true);
	});

	it('rate limits IP submits at the configured threshold', () => {
		expect(isSignupIpRateLimited(SIGNUP_SUBMITS_PER_IP_PER_HOUR - 1)).toBe(false);
		expect(isSignupIpRateLimited(SIGNUP_SUBMITS_PER_IP_PER_HOUR)).toBe(true);
	});

	it('skips IP enforcement when client IP is missing', () => {
		expect(shouldEnforceSignupIpRateLimit(null)).toBe(false);
		expect(shouldEnforceSignupIpRateLimit('')).toBe(false);
		expect(shouldEnforceSignupIpRateLimit('1.2.3.4')).toBe(true);
	});

	it('prefers cf-connecting-ip then the first x-forwarded-for hop', () => {
		expect(resolveSignupClientIp(new Headers({ 'cf-connecting-ip': '9.9.9.9' }))).toBe('9.9.9.9');
		expect(resolveSignupClientIp(new Headers({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2' }))).toBe('1.1.1.1');
		expect(resolveSignupClientIp(new Headers())).toBeNull();
	});
});
