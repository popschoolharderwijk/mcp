import { describe, expect, it } from 'bun:test';
import {
	buildAgreementWizardStudentDisplay,
	shouldShowAgreementWizardEditHeader,
} from '../../../src/lib/agreements/agreementWizardPageHeaderHelpers';
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

describe('buildAgreementWizardStudentDisplay', () => {
	it('builds full name from first and last name', () => {
		expect(buildAgreementWizardStudentDisplay(mockRow())).toEqual({
			studentName: 'Jan Jansen',
		});
	});

	it('falls back to email when names are missing', () => {
		expect(
			buildAgreementWizardStudentDisplay(
				mockRow({
					student: { first_name: null, last_name: null, avatar_url: null, email: 'jan@example.com' },
				}),
			),
		).toEqual({
			studentName: 'jan@example.com',
		});
	});
});

describe('shouldShowAgreementWizardEditHeader', () => {
	it('returns true in edit mode with an agreement', () => {
		const agreement = mockRow();
		expect(shouldShowAgreementWizardEditHeader(true, agreement)).toBe(true);
	});

	it('returns false in create mode', () => {
		expect(shouldShowAgreementWizardEditHeader(false, mockRow())).toBe(false);
	});

	it('returns false without an agreement', () => {
		expect(shouldShowAgreementWizardEditHeader(true, null)).toBe(false);
	});
});
