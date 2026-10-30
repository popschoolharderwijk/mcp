import { isValidIban, normalizeIban } from '../../../supabase/functions/_shared/ibanHelpers.ts';

export { isValidIban, normalizeIban };

/**
 * Format an IBAN for display with a space every 4 characters.
 */
export function formatIban(input: string): string {
	const iban = normalizeIban(input);
	return iban.replace(/(.{4})/g, '$1 ').trim();
}
