import { describe, expect, it } from 'bun:test';
import { resolveSignedStorageUrlResult } from '../../../src/lib/direct-debit/signedUrlHelpers';

describe('resolveSignedStorageUrlResult', () => {
	it('returns signed url when present', () => {
		expect(resolveSignedStorageUrlResult({ signedUrl: 'https://example.com/file.xml' }, null)).toEqual({
			ok: true,
			signedUrl: 'https://example.com/file.xml',
		});
	});

	it('returns error message from storage error', () => {
		expect(resolveSignedStorageUrlResult(null, { message: 'Not found' })).toEqual({
			ok: false,
			error: 'Not found',
		});
	});

	it('returns default error when signed url is missing', () => {
		expect(resolveSignedStorageUrlResult({}, null)).toEqual({ ok: false, error: 'Geen URL' });
	});
});
