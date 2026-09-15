import { describe, expect, it } from 'bun:test';
import { NAV_ICONS, NAV_LABELS } from '../../../src/config/nav-labels';

describe('NAV_LABELS and NAV_ICONS', () => {
	it('uses canonical names for agreements and lesson types', () => {
		expect(NAV_LABELS.agreements).toBe('Overeenkomsten');
		expect(NAV_LABELS.lessonTypes).toBe('Lessoorten');
	});

	it('exposes the same keys on labels and icons', () => {
		expect(Object.keys(NAV_LABELS)).toEqual(Object.keys(NAV_ICONS));
	});

	it('keeps student, agreement and lesson-type labels aligned with icons', () => {
		expect(NAV_LABELS.students).toBe('Leerlingen');
		expect(NAV_ICONS.students).toBeDefined();
		expect(NAV_LABELS.agreements).toBe('Overeenkomsten');
		expect(NAV_ICONS.agreements).toBeDefined();
		expect(NAV_LABELS.lessonTypes).toBe('Lessoorten');
		expect(NAV_ICONS.lessonTypes).toBeDefined();
	});
});
