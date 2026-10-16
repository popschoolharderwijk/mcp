import { describe, expect, it } from 'bun:test';
import { formatProfileFullName, mandateListProfileName } from '../../../src/lib/direct-debit/mandateDisplayHelpers';

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

describe('mandateListProfileName', () => {
	it('reads a single embedded profile', () => {
		expect(
			mandateListProfileName({
				first_name: 'Anna',
				last_name: 'Jansen',
				email: 'anna@example.com',
			}),
		).toBe('Anna Jansen');
	});

	it('reads the first profile when the embed is an array', () => {
		expect(
			mandateListProfileName([
				{
					first_name: 'Anna',
					last_name: 'Jansen',
					email: 'anna@example.com',
				},
			]),
		).toBe('Anna Jansen');
	});

	it('returns a dash when the embed is null', () => {
		expect(mandateListProfileName(null)).toBe('—');
	});

	it('returns a dash when the embed array is empty', () => {
		expect(mandateListProfileName([])).toBe('—');
	});
});
