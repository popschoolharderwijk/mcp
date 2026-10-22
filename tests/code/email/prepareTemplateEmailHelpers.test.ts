import { describe, expect, it } from 'bun:test';
import {
	isFailedEmailEventResult,
	readTemplateEmailEnv,
} from '../../../supabase/functions/send-template-email/prepareTemplateEmailHelpers';

describe('readTemplateEmailEnv', () => {
	it('reads template email env keys with empty fallbacks', () => {
		expect(
			readTemplateEmailEnv((key) => {
				const values: Record<string, string> = {
					SUPABASE_URL: 'https://supabase.example',
					SUPABASE_ANON_KEY: 'anon',
					SUPABASE_SERVICE_ROLE_KEY: 'service',
					RESEND_API_KEY_TRANSACTIONAL: 'resend',
					RESEND_FROM_EMAIL: 'mail@example.com',
				};
				return values[key];
			}),
		).toEqual({
			supabaseUrl: 'https://supabase.example',
			anonKey: 'anon',
			serviceKey: 'service',
			resendKey: 'resend',
			fromEmail: 'mail@example.com',
		});
	});

	it('returns empty strings for missing env keys', () => {
		expect(readTemplateEmailEnv(() => undefined)).toEqual({
			supabaseUrl: '',
			anonKey: '',
			serviceKey: '',
			resendKey: '',
			fromEmail: '',
		});
	});
});

describe('isFailedEmailEventResult', () => {
	it('returns true for response results', () => {
		expect(isFailedEmailEventResult(new Response('bad', { status: 404 }))).toBe(true);
	});

	it('returns false for successful event results', () => {
		expect(isFailedEmailEventResult({ eventDef: { key: 'signup_received' } })).toBe(false);
	});
});
