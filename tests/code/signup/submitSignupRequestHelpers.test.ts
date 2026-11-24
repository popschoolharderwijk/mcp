import { describe, expect, it } from 'bun:test';
import {
	buildSignupCaptchaFailedResponse,
	buildSignupInsertErrorMessage,
	buildSignupInsertErrorResponse,
	buildSignupMailFailedResponse,
	buildSignupRateLimitedResponse,
	buildSignupSuccessResponse,
	parseSignupRequestBody,
	readSignupCaptchaToken,
	readSignupServiceEnv,
	resolveSignupInvalidJsonResponse,
	resolveSignupMethodResponse,
} from '../../../supabase/functions/submit-signup-request/submitSignupRequestHelpers';

async function readError(response: Response): Promise<string> {
	const body = (await response.json()) as { error: string };
	return body.error;
}

describe('buildSignupInsertErrorMessage', () => {
	it('includes the database message and code', () => {
		expect(buildSignupInsertErrorMessage({ message: 'duplicate key', code: '23505' })).toBe(
			'Kon aanmelding niet opslaan: duplicate key (23505)',
		);
	});

	it('omits the code suffix when code is missing', () => {
		expect(buildSignupInsertErrorMessage({ message: 'insert failed' })).toBe(
			'Kon aanmelding niet opslaan: insert failed',
		);
	});
});

describe('buildSignupInsertErrorResponse', () => {
	it('returns a 500 response with the insert error message', async () => {
		const response = buildSignupInsertErrorResponse({ message: 'insert failed', code: '23505' });
		expect(response.status).toBe(500);
		expect(await readError(response)).toBe('Kon aanmelding niet opslaan: insert failed (23505)');
	});
});

describe('buildSignupSuccessResponse', () => {
	it('returns ok without exposing a request id', async () => {
		const response = buildSignupSuccessResponse();
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
	});
});

describe('buildSignupRateLimitedResponse', () => {
	it('returns 429 with a Dutch rate limit message', async () => {
		const response = buildSignupRateLimitedResponse();
		expect(response.status).toBe(429);
		expect(await readError(response)).toBe('Te veel aanmeldpogingen. Probeer het later opnieuw.');
	});
});

describe('buildSignupCaptchaFailedResponse', () => {
	it('returns 400 when captcha is missing or invalid', async () => {
		const response = buildSignupCaptchaFailedResponse();
		expect(response.status).toBe(400);
		expect(await readError(response)).toBe('Bevestig dat je geen robot bent en probeer opnieuw.');
	});
});

describe('buildSignupMailFailedResponse', () => {
	it('returns 502 when confirm mail cannot be sent', async () => {
		const response = buildSignupMailFailedResponse();
		expect(response.status).toBe(502);
		expect(await readError(response)).toBe(
			'Bevestigingsmail kon niet worden verzonden. Probeer het later opnieuw.',
		);
	});
});

describe('readSignupCaptchaToken', () => {
	it('returns trimmed captcha tokens and rejects empty values', () => {
		expect(readSignupCaptchaToken({ captchaToken: ' abc ' })).toBe('abc');
		expect(readSignupCaptchaToken({ captchaToken: ' ' })).toBeNull();
		expect(readSignupCaptchaToken({})).toBeNull();
	});
});

describe('resolveSignupMethodResponse', () => {
	it('returns an options response for preflight requests', () => {
		expect(resolveSignupMethodResponse('OPTIONS')?.status).toBe(204);
	});

	it('returns a method-not-allowed response for non-post requests', async () => {
		const response = resolveSignupMethodResponse('GET');
		expect(response?.status).toBe(405);
		expect(await readError(response as Response)).toBe('Method not allowed');
	});

	it('returns null for post requests', () => {
		expect(resolveSignupMethodResponse('POST')).toBeNull();
	});
});

describe('parseSignupRequestBody', () => {
	it('returns parsed json for valid request bodies', async () => {
		const req = new Request('https://example.com', {
			method: 'POST',
			body: JSON.stringify({ email: 'student@example.com' }),
		});
		const parsed = await parseSignupRequestBody(req);
		expect(parsed.ok).toBe(true);
		const success = parsed as { ok: true; body: { email: string } };
		expect(success.body).toEqual({ email: 'student@example.com' });
	});

	it('returns an invalid json response for malformed bodies', async () => {
		const req = new Request('https://example.com', { method: 'POST', body: '{' });
		const parsed = await parseSignupRequestBody(req);
		expect(parsed.ok).toBe(false);
		const failure = parsed as { ok: false; response: Response };
		expect(failure.response.status).toBe(400);
		expect(await readError(failure.response)).toBe('Invalid JSON');
	});
});

describe('readSignupServiceEnv', () => {
	it('reads signup service env keys including Turnstile', () => {
		expect(
			readSignupServiceEnv((key) => {
				const values: Record<string, string> = {
					SUPABASE_URL: 'https://supabase.example',
					SUPABASE_SERVICE_ROLE_KEY: 'service',
					TURNSTILE_SECRET_KEY: 'turnstile-secret',
				};
				return values[key];
			}),
		).toEqual({
			supabaseUrl: 'https://supabase.example',
			serviceKey: 'service',
			turnstileSecret: 'turnstile-secret',
		});
	});
});

describe('resolveSignupInvalidJsonResponse', () => {
	it('returns a 400 response for invalid json', async () => {
		const response = resolveSignupInvalidJsonResponse();
		expect(response.status).toBe(400);
		expect(await readError(response)).toBe('Invalid JSON');
	});
});
