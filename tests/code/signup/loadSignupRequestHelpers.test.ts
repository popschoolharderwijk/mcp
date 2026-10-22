import { describe, expect, it } from 'bun:test';
import { validateSignupRequestStatus } from '../../../supabase/functions/approve-signup-request/loadSignupRequestHelpers';

async function readError(response: Response): Promise<string> {
	const body = (await response.json()) as { error: string };
	return body.error;
}

describe('validateSignupRequestStatus', () => {
	it('returns null for pending requests', () => {
		expect(validateSignupRequestStatus('pending')).toBeNull();
	});

	it('returns null for trial scheduled requests', () => {
		expect(validateSignupRequestStatus('trial_scheduled')).toBeNull();
	});

	it('returns conflict for processed requests', async () => {
		const response = validateSignupRequestStatus('approved');
		expect(response?.status).toBe(409);
		expect(await readError(response as Response)).toBe('Aanmelding is al verwerkt');
	});
});
