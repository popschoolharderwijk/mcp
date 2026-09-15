import { describe, expect, it } from 'bun:test';
import {
	requireValidUuidField,
	resolveAllowedRedirectUrl,
	resolveAllowedSiteUrl,
} from '../../../supabase/functions/_shared/http';

describe('resolveAllowedSiteUrl', () => {
	it('returns the origin for allowed https hosts', () => {
		expect(resolveAllowedSiteUrl('https://mcp.mplifi.nl/path')).toBe('https://mcp.mplifi.nl');
		expect(resolveAllowedSiteUrl('https://instant-setup-kit.lovable.app')).toBe(
			'https://instant-setup-kit.lovable.app',
		);
	});

	it('returns null for disallowed or invalid urls', () => {
		expect(resolveAllowedSiteUrl('http://mcp.mplifi.nl')).toBeNull();
		expect(resolveAllowedSiteUrl('https://evil.example.com')).toBeNull();
		expect(resolveAllowedSiteUrl('not-a-url')).toBeNull();
		expect(resolveAllowedSiteUrl(null)).toBeNull();
	});
});

describe('resolveAllowedRedirectUrl', () => {
	it('returns the full url for allowed https hosts', () => {
		expect(resolveAllowedRedirectUrl('https://mcp.mplifi.nl/incasso/start?agreement=1')).toBe(
			'https://mcp.mplifi.nl/incasso/start?agreement=1',
		);
	});

	it('returns null for disallowed or invalid urls', () => {
		expect(resolveAllowedRedirectUrl('http://mcp.mplifi.nl/success')).toBeNull();
		expect(resolveAllowedRedirectUrl('https://evil.example.com/success')).toBeNull();
		expect(resolveAllowedRedirectUrl('not-a-url')).toBeNull();
		expect(resolveAllowedRedirectUrl(null)).toBeNull();
	});
});

describe('requireValidUuidField', () => {
	it('returns null for a valid uuid', () => {
		expect(requireValidUuidField('11111111-1111-1111-1111-111111111111', 'request id')).toBeNull();
	});

	it('returns a 400 response for missing or invalid uuids', async () => {
		const missing = requireValidUuidField(undefined, 'request id');
		expect(missing?.status).toBe(400);
		expect(await (missing as Response).json()).toEqual({ error: 'Ongeldig request id' });

		const invalid = requireValidUuidField('bad', 'request id');
		expect(invalid?.status).toBe(400);
	});
});
