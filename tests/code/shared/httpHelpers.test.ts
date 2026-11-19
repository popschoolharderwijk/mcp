import { describe, expect, it } from 'bun:test';
import {
	requireValidUuidField,
	resolveAllowedRedirectUrl,
	resolveAllowedSiteUrl,
} from '../../../supabase/functions/_shared/http';

describe('resolveAllowedSiteUrl', () => {
	it('returns origin only for allow-listed https URLs', () => {
		expect(resolveAllowedSiteUrl('https://mcp.mplifi.nl/path')).toBe('https://mcp.mplifi.nl');
	});

	it('allows http only on loopback hosts', () => {
		expect(resolveAllowedSiteUrl('http://127.0.0.1:8081/pay')).toBe('http://127.0.0.1:8081');
		expect(resolveAllowedSiteUrl('http://mcp.mplifi.nl')).toBeNull();
		expect(resolveAllowedSiteUrl('https://127.0.0.1:8081')).toBeNull();
	});

	it('rejects unknown hosts and invalid input', () => {
		expect(resolveAllowedSiteUrl('https://evil.example.com')).toBeNull();
		expect(resolveAllowedSiteUrl('not-a-url')).toBeNull();
		expect(resolveAllowedSiteUrl(null)).toBeNull();
	});
});

describe('resolveAllowedRedirectUrl', () => {
	it('keeps path and query for allow-listed URLs', () => {
		expect(resolveAllowedRedirectUrl('https://mcp.mplifi.nl/stripe/checkout/start?agreement=1')).toBe(
			'https://mcp.mplifi.nl/stripe/checkout/start?agreement=1',
		);
		expect(resolveAllowedRedirectUrl('https://evil.example.com/success')).toBeNull();
	});
});

describe('requireValidUuidField', () => {
	it('returns a 400 with the field label when missing or invalid', async () => {
		const missing = requireValidUuidField(undefined, 'request id');
		expect(missing?.status).toBe(400);
		expect(await (missing as Response).json()).toEqual({ error: 'Ongeldig request id' });

		const invalid = requireValidUuidField('bad', 'lesson agreement id');
		expect(invalid?.status).toBe(400);
		expect(await (invalid as Response).json()).toEqual({ error: 'Ongeldig lesson agreement id' });
	});
});
