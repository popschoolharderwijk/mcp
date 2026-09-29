import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

const exchangeCodeForSession = mock(
	(): Promise<{ error: { message: string } | null }> => Promise.resolve({ error: null }),
);
const verifyOtp = mock((): Promise<{ error: { message: string } | null }> => Promise.resolve({ error: null }));
const replaceState = mock(() => {});

mock.module('../../../src/integrations/supabase/client', () => ({
	supabase: {
		auth: {
			exchangeCodeForSession,
			verifyOtp,
		},
	},
}));

function setWindowLocation(url: string): void {
	const parsed = new URL(url);
	Object.defineProperty(globalThis, 'window', {
		value: {
			location: {
				href: parsed.href,
				pathname: parsed.pathname,
				search: parsed.search,
				hash: parsed.hash,
			},
			history: { replaceState },
		},
		configurable: true,
	});
}

describe('readMagicLinkUrlError', () => {
	let readMagicLinkUrlError: typeof import('../../../src/lib/auth/magicLink').readMagicLinkUrlError;

	beforeAll(async () => {
		({ readMagicLinkUrlError } = await import('../../../src/lib/auth/magicLink'));
	});

	it('returns null when the hash has no error', () => {
		setWindowLocation('http://localhost/direct-debit');
		expect(readMagicLinkUrlError()).toBeNull();
	});

	it('returns a Dutch message for expired OTP links', () => {
		setWindowLocation('http://localhost/direct-debit#error=access_denied&error_code=otp_expired');
		expect(readMagicLinkUrlError()).toBe('Deze inloglink is verlopen of al gebruikt. Vraag een nieuwe link aan.');
	});

	it('returns the error description from the hash', () => {
		setWindowLocation('http://localhost/direct-debit#error=access_denied&error_description=Invalid+token');
		expect(readMagicLinkUrlError()).toBe('Invalid token');
	});

	it('returns a generic message when only error is present', () => {
		setWindowLocation('http://localhost/direct-debit#error=access_denied');
		expect(readMagicLinkUrlError()).toBe('Inloggen via deze link is mislukt.');
	});
});

describe('consumeMagicLinkFromUrl', () => {
	let consumeMagicLinkFromUrl: typeof import('../../../src/lib/auth/magicLink').consumeMagicLinkFromUrl;

	beforeAll(async () => {
		({ consumeMagicLinkFromUrl } = await import('../../../src/lib/auth/magicLink'));
	});

	beforeEach(() => {
		exchangeCodeForSession.mockReset();
		verifyOtp.mockReset();
		replaceState.mockReset();
		exchangeCodeForSession.mockImplementation(() => Promise.resolve({ error: null }));
		verifyOtp.mockImplementation(() => Promise.resolve({ error: null }));
	});

	it('exchanges a PKCE code from the query string', async () => {
		setWindowLocation('http://localhost/direct-debit?code=abc123');
		const result = await consumeMagicLinkFromUrl();
		expect(result).toEqual({ ok: true });
		expect(exchangeCodeForSession).toHaveBeenCalledTimes(1);
	});

	it('returns an error when PKCE exchange fails', async () => {
		setWindowLocation('http://localhost/direct-debit?code=abc123');
		exchangeCodeForSession.mockImplementation(() => Promise.resolve({ error: { message: 'invalid code' } }));
		const result = await consumeMagicLinkFromUrl();
		expect(result).toEqual({
			ok: false,
			error: 'Inloggen mislukt: invalid code. De link is mogelijk verlopen.',
		});
	});

	it('verifies a token_hash from the URL hash', async () => {
		setWindowLocation('http://localhost/direct-debit#token_hash=hash123&type=email');
		const result = await consumeMagicLinkFromUrl();
		expect(result).toEqual({ ok: true });
		expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'hash123', type: 'email' });
		expect(replaceState).toHaveBeenCalledTimes(1);
	});

	it('rejects invalid token_hash links', async () => {
		setWindowLocation('http://localhost/direct-debit#token_hash=hash123&type=signup');
		const result = await consumeMagicLinkFromUrl();
		expect(result).toEqual({
			ok: false,
			error: 'Ongeldige uitnodigingslink. Vraag een nieuwe link aan.',
		});
	});

	it('returns ok when no magic-link parameters are present', async () => {
		setWindowLocation('http://localhost/direct-debit');
		const result = await consumeMagicLinkFromUrl();
		expect(result).toEqual({ ok: true });
	});
});

describe('getFunctionErrorMessage', () => {
	let getFunctionErrorMessage: typeof import('../../../src/lib/auth/magicLink').getFunctionErrorMessage;

	beforeAll(async () => {
		({ getFunctionErrorMessage } = await import('../../../src/lib/auth/magicLink'));
	});

	it('returns the error field from a response payload', async () => {
		const message = await getFunctionErrorMessage({ error: 'Custom failure' }, null, 'Fallback');
		expect(message).toBe('Custom failure');
	});

	it('returns the error field from a Response context', async () => {
		const response = new Response(JSON.stringify({ error: 'Edge failure' }), { status: 400 });
		const message = await getFunctionErrorMessage(null, { context: response }, 'Fallback');
		expect(message).toBe('Edge failure');
	});

	it('returns the Error message when no structured error exists', async () => {
		const message = await getFunctionErrorMessage(null, new Error('Network down'), 'Fallback');
		expect(message).toBe('Network down');
	});

	it('returns the fallback for unknown error shapes', async () => {
		const message = await getFunctionErrorMessage(null, { code: 500 }, 'Fallback');
		expect(message).toBe('Fallback');
	});
});
