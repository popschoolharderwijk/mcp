import { describe, expect, it } from 'bun:test';
import { isValidCronSecret } from '../../../supabase/functions/stripe-billing-daily/authPure';

describe('isValidCronSecret', () => {
	it('accepts only the exact secret', () => {
		expect(isValidCronSecret('abc123', 'abc123')).toBe(true);
		expect(isValidCronSecret('abc124', 'abc123')).toBe(false);
		expect(isValidCronSecret(null, 'abc123')).toBe(false);
		expect(isValidCronSecret('abc123', undefined)).toBe(false);
		expect(isValidCronSecret('publishable-key', 'private-cron-secret')).toBe(false);
		expect(isValidCronSecret('', '')).toBe(false);
	});
});
