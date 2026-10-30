import { describe, expect, it } from 'bun:test';
import { WizardStep } from '../../../src/components/agreements/WizardStepIndicator';
import { agreementBreadcrumbItems, wizardInitFromAgreement } from '../../../src/lib/agreements/agreementWizardHelpers';
import type { AgreementTableRow } from '../../../src/types/lesson-agreements';

function mockRow(overrides: Partial<AgreementTableRow> = {}): AgreementTableRow {
	return {
		id: 'agr-1',
		day_of_week: 1,
		start_time: '09:00',
		start_date: '2026-09-01',
		end_date: null,
		is_active: true,
		student_user_id: 'stu-1',
		lesson_type_id: 'lt-1',
		duration_minutes: 60,
		frequency: 'weekly',
		price_per_lesson: 30,
		created_at: '2026-01-01T00:00:00Z',
		notes: null,
		teacher_user_id: 'tea-1',
		student: {
			first_name: 'Jan',
			last_name: 'Jansen',
			avatar_url: null,
			email: 'jan@example.com',
		},
		teacher: {
			first_name: 'Piet',
			last_name: 'Docent',
			avatar_url: null,
			email: 'piet@example.com',
		},
		lesson_type: { id: 'lt-1', name: 'Piano', icon: 'piano', color: '#000000' },
		...overrides,
	};
}

describe('wizardInitFromAgreement', () => {
	it('returns null while the agreement is loading', () => {
		expect(wizardInitFromAgreement(true, false, null, '2027-07-31')).toBeNull();
	});

	it('starts on the confirm step in edit mode', () => {
		const result = wizardInitFromAgreement(false, true, mockRow(), '2027-07-31');
		expect(result?.step).toBe(WizardStep.Confirm);
		expect(result?.highestStep).toBe(3);
		expect(result?.formPatch?.studentUserId).toBe('stu-1');
	});

	it('starts on the user step in create mode', () => {
		const result = wizardInitFromAgreement(false, false, null, '2027-07-31');
		expect(result?.step).toBe(WizardStep.User);
		expect(result?.highestStep).toBe(0);
		expect(result?.formPatch).toBeNull();
	});

	it('uses the default end date when the agreement end date is blank', () => {
		const result = wizardInitFromAgreement(false, true, mockRow({ end_date: '   ' }), '2027-07-31');
		expect(result?.formPatch?.endDate).toBe('2027-07-31');
	});

	it('maps agreement fields into the wizard form patch', () => {
		const agreement = mockRow({ end_date: '2027-06-30' });
		const result = wizardInitFromAgreement(false, true, agreement, '2027-07-31');
		expect(result?.formPatch).toEqual({
			studentUserId: 'stu-1',
			user: {
				user_id: 'stu-1',
				first_name: 'Jan',
				last_name: 'Jansen',
				email: 'jan@example.com',
				avatar_url: null,
				phone_number: null,
			},
			lessonTypeId: 'lt-1',
			selectedOptionSnapshot: {
				duration_minutes: 60,
				frequency: 'weekly',
				price_per_lesson: 30,
			},
			startDate: '2026-09-01',
			endDate: '2027-06-30',
			teacherUserId: 'tea-1',
			slot: {
				day_of_week: 1,
				start_time: '09:00',
				end_time: '09:00',
				status: 'free',
				totalOccurrences: 0,
				occupiedOccurrences: 0,
			},
		});
	});
});

describe('agreementBreadcrumbItems', () => {
	it('returns null while loading', () => {
		expect(agreementBreadcrumbItems(true, true, mockRow(), 'agr-1')).toBeNull();
	});

	it('returns null outside edit mode', () => {
		expect(agreementBreadcrumbItems(false, false, mockRow(), 'agr-1')).toBeNull();
	});

	it('returns null without agreement or id', () => {
		expect(agreementBreadcrumbItems(false, true, null, 'agr-1')).toBeNull();
		expect(agreementBreadcrumbItems(false, true, mockRow(), undefined)).toBeNull();
	});

	it('builds a breadcrumb suffix with student and lesson type', () => {
		expect(agreementBreadcrumbItems(false, true, mockRow(), 'agr-1')).toEqual([
			{ label: 'Jan Jansen (Piano)', href: '/agreements/agr-1' },
		]);
	});

	it('falls back to lesson type name when student name is missing', () => {
		const agreement = mockRow({
			student: { first_name: null, last_name: null, avatar_url: null, email: '' },
		});
		expect(agreementBreadcrumbItems(false, true, agreement, 'agr-1')).toEqual([
			{ label: 'Piano', href: '/agreements/agr-1' },
		]);
	});
});
