import { describe, expect, it } from 'bun:test';
import { createInitialWizardForm } from '../../../src/components/agreements/wizard/wizardFormTypes';

describe('createInitialWizardForm', () => {
	it('creates empty wizard form state with provided default dates', () => {
		expect(createInitialWizardForm('2026-09-01', '2027-07-31')).toEqual({
			studentUserId: null,
			user: null,
			lessonTypeId: null,
			selectedOptionSnapshot: null,
			startDate: '2026-09-01',
			endDate: '2027-07-31',
			teacherUserId: null,
			slot: null,
			partnerStudentUserId: null,
			partnerUser: null,
		});
	});
});
