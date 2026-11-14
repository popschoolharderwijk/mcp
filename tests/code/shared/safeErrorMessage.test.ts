import { describe, expect, it } from 'bun:test';
import { getSafeErrorMessage } from '../../../supabase/functions/_shared/errors';

describe('getSafeErrorMessage', () => {
	it('returns only the first line of an Error message', () => {
		expect(getSafeErrorMessage(new Error('Kon factuur niet maken\n    at billing.ts:10:1'))).toBe(
			'Kon factuur niet maken',
		);
	});

	it('truncates a long first line to 300 characters', () => {
		expect(getSafeErrorMessage(new Error(`${'x'.repeat(350)}\nat hidden`))).toBe('x'.repeat(300));
	});

	it('uses the fallback for values that are not Error instances', () => {
		expect(getSafeErrorMessage('Error: secret\n    at internal (/app/handler.ts:12:3)')).toBe('Onverwachte fout');
		expect(getSafeErrorMessage({ message: 'raw object', stack: 'at internal' }, 'Kon niet syncen')).toBe(
			'Kon niet syncen',
		);
		expect(getSafeErrorMessage(undefined)).toBe('Onverwachte fout');
	});
});
