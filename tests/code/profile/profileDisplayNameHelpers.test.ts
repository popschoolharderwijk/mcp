import { describe, expect, it } from 'bun:test';
import { formatProfileFullName } from '../../../src/lib/profile/profileDisplayNameHelpers';

describe('formatProfileFullName', () => {
	it('returns em dash when profile is missing', () => {
		expect(formatProfileFullName(null)).toBe('—');
	});

	it('returns trimmed full name when present', () => {
		expect(
			formatProfileFullName({
				first_name: 'Anna',
				last_name: 'Bakker',
				email: 'anna@example.com',
			}),
		).toBe('Anna Bakker');
	});

	it('falls back to email when name is empty', () => {
		expect(
			formatProfileFullName({
				first_name: null,
				last_name: '   ',
				email: 'only@example.com',
			}),
		).toBe('only@example.com');
	});
});
