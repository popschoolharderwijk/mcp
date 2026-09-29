import { describe, expect, it } from 'bun:test';
import { formatProfileFullName } from '../../../src/lib/direct-debit/mandateDisplayHelpers';

describe('formatProfileFullName', () => {
	it('returns dash when profile is missing', () => {
		expect(formatProfileFullName(null)).toBe('—');
	});

	it('returns full name when available', () => {
		expect(
			formatProfileFullName({
				first_name: 'Anna',
				last_name: 'Jansen',
				email: 'anna@example.com',
			}),
		).toBe('Anna Jansen');
	});

	it('falls back to email when name is empty', () => {
		expect(
			formatProfileFullName({
				first_name: null,
				last_name: null,
				email: 'anna@example.com',
			}),
		).toBe('anna@example.com');
	});
});
