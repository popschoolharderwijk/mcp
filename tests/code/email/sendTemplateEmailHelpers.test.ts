import { describe, expect, it } from 'bun:test';
import {
	buildSendTemplateEmailFetchInit,
	buildSendTemplateEmailRequestBody,
	prepareSendTemplateEmailRequest,
	resolveMissingSendTemplateEmailConfig,
	resolveSendTemplateEmailHttpFailure,
} from '../../../supabase/functions/_shared/sendTemplateEmailHelpers';

describe('buildSendTemplateEmailRequestBody', () => {
	it('builds request body with defaults', () => {
		expect(
			buildSendTemplateEmailRequestBody({
				event_key: 'welcome',
				to: 'jan@test.nl',
			}),
		).toEqual({
			event_key: 'welcome',
			to: 'jan@test.nl',
			vars: {},
			site_url: undefined,
		});
	});

	it('includes vars and site url when provided', () => {
		expect(
			buildSendTemplateEmailRequestBody({
				event_key: 'welcome',
				to: 'jan@test.nl',
				vars: { name: 'Jan' },
				site_url: 'https://portal.example.com',
			}).vars,
		).toEqual({ name: 'Jan' });
	});
});

describe('buildSendTemplateEmailFetchInit', () => {
	it('builds fetch init with auth, apikey, and json body', () => {
		const body = buildSendTemplateEmailRequestBody({
			event_key: 'welcome',
			to: 'jan@test.nl',
		});
		expect(buildSendTemplateEmailFetchInit('service-key', body)).toEqual({
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: 'Bearer service-key',
				apikey: 'service-key',
			},
			body: JSON.stringify(body),
		});
	});
});

describe('sendTemplateEmail failure helpers', () => {
	it('flags missing supabase url or service key', () => {
		expect(resolveMissingSendTemplateEmailConfig('', 'key')).toEqual({
			ok: false,
			error: 'Mail-configuratie ontbreekt',
			status: 500,
		});
		expect(resolveMissingSendTemplateEmailConfig('https://x', '')).toEqual({
			ok: false,
			error: 'Mail-configuratie ontbreekt',
			status: 500,
		});
		expect(resolveMissingSendTemplateEmailConfig('https://x', 'key')).toBeNull();
	});

	it('prefers JSON error body from send-template-email', () => {
		expect(resolveSendTemplateEmailHttpFailure(401, '{"error":"Unauthorized"}')).toEqual({
			ok: false,
			error: 'Unauthorized',
			status: 401,
		});
		expect(resolveSendTemplateEmailHttpFailure(502, 'gateway boom')).toEqual({
			ok: false,
			error: 'Mail-verzending mislukt',
			status: 502,
		});
	});

	it('prepares a send request when env and origin resolve', () => {
		expect(
			prepareSendTemplateEmailRequest(
				{ event_key: 'welcome', to: 'jan@test.nl', origin: 'https://app.example.com' },
				(key) =>
					key === 'SUPABASE_URL' ? 'https://sb' : key === 'SUPABASE_SERVICE_ROLE_KEY' ? 'svc' : undefined,
				() => 'https://app.example.com',
			),
		).toEqual({
			ok: true,
			supabaseUrl: 'https://sb',
			serviceKey: 'svc',
			requestBody: {
				event_key: 'welcome',
				to: 'jan@test.nl',
				vars: {},
				site_url: 'https://app.example.com',
			},
		});
		expect(
			prepareSendTemplateEmailRequest(
				{ event_key: 'welcome', to: 'jan@test.nl' },
				() => undefined,
				() => null,
			),
		).toEqual({
			ok: false,
			error: 'Mail-configuratie ontbreekt',
			status: 500,
		});
	});
});
