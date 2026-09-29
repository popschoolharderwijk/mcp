import { describe, expect, it } from 'bun:test';
import { validateImportBody } from '../../../supabase/functions/import-sepa-status/importSepaStatusValidationPure';

async function readError(response: Response): Promise<string> {
	const body = (await response.json()) as { error: string };
	return body.error;
}

describe('validateImportBody', () => {
	it('returns null when xml is present', () => {
		expect(validateImportBody({ xml: '<Document></Document>' })).toBeNull();
	});

	it('returns error response when xml is missing', async () => {
		const response = validateImportBody({});
		expect(response?.status).toBe(400);
		expect(await readError(response as Response)).toBe('Verplicht veld ontbreekt: xml (pain.002 inhoud)');
	});
});
