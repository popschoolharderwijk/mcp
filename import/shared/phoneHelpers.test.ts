import { describe, expect, it } from 'bun:test';
import { normalizeDutchMobilePhone } from './phoneHelpers';

describe('normalizeDutchMobilePhone', () => {
	it('returns null for empty input', () => {
		expect(normalizeDutchMobilePhone(null)).toBeNull();
		expect(normalizeDutchMobilePhone('')).toBeNull();
		expect(normalizeDutchMobilePhone('   ')).toBeNull();
	});

	it('keeps a valid 06 number', () => {
		expect(normalizeDutchMobilePhone('0612345678')).toBe('0612345678');
	});

	it('strips separators from a national mobile', () => {
		expect(normalizeDutchMobilePhone('06-94350865')).toBe('0694350865');
		expect(normalizeDutchMobilePhone('06 00319217')).toBe('0600319217');
	});

	it('converts +31 and 0031 mobiles to 06…', () => {
		expect(normalizeDutchMobilePhone('+31612345678')).toBe('0612345678');
		expect(normalizeDutchMobilePhone('0031612345678')).toBe('0612345678');
		expect(normalizeDutchMobilePhone('+31 6 1234 5678')).toBe('0612345678');
	});

	it('returns null for landlines and invalid lengths', () => {
		expect(normalizeDutchMobilePhone('0708360593')).toBeNull();
		expect(normalizeDutchMobilePhone('061234567')).toBeNull();
		expect(normalizeDutchMobilePhone('123')).toBeNull();
	});
});
