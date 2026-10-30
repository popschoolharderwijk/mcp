import { describe, expect, it } from 'bun:test';
import { NAV_DESCRIPTIONS, NAV_ICONS, NAV_LABELS } from '../../../src/config/nav-items';

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

describe('NAV_DESCRIPTIONS', () => {
	it('exposes only known page-description keys as a subset of NAV_LABELS', () => {
		const descriptionKeys = Object.keys(NAV_DESCRIPTIONS).sort();
		expect(descriptionKeys).toEqual([
			'agreements',
			'announcements',
			'availability',
			'dashboard',
			'lessonGroups',
			'lessonTypes',
			'myAvailability',
			'myProfile',
			'myStatistics',
			'myStudents',
			'myTrial',
			'projects',
			'reports',
			'settings',
			'signupRequests',
			'students',
			'teachers',
			'trialLessons',
			'users',
		]);
		expect(Object.keys(NAV_LABELS)).toEqual(expect.arrayContaining(descriptionKeys));
	});

	it('locks settings description including e-mailtemplates', () => {
		expect(NAV_DESCRIPTIONS.settings).toBe(
			'Schooljaar, lesvrije periodes, agenda, tarieven, e-mailtemplates en overige siteconfiguratie',
		);
	});

	it('locks agreements and lessonTypes page blurbs', () => {
		expect(NAV_DESCRIPTIONS.agreements).toBe('Beheer lesovereenkomsten tussen leerlingen en docenten');
		expect(NAV_DESCRIPTIONS.lessonTypes).toBe('Beheer alle lessoorten en hun configuratie');
	});
});
