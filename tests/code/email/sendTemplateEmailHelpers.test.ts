import { describe, expect, it } from 'bun:test';
import {
	buildSendTemplateEmailFetchInit,
	buildSendTemplateEmailRequestBody,
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
	it('builds fetch init with auth header and json body', () => {
		const body = buildSendTemplateEmailRequestBody({
			event_key: 'welcome',
			to: 'jan@test.nl',
		});
		expect(buildSendTemplateEmailFetchInit('service-key', body)).toEqual({
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: 'Bearer service-key',
			},
			body: JSON.stringify(body),
		});
	});
});
