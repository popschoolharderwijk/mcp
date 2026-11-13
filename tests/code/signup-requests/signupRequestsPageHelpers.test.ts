import { describe, expect, it } from 'bun:test';
import {
	buildAgreementWizardUrl,
	mapSignupRequestBaseRow,
	shouldSkipAgreementWizard,
	statusBadgeVariant,
} from '../../../src/lib/signup-requests/signupRequestsPageHelpers';

describe('signupRequestsPageHelpers', () => {
	it('maps status badge variants', () => {
		expect(statusBadgeVariant('pending')).toBe('default');
		expect(statusBadgeVariant('approved')).toBe('secondary');
		expect(statusBadgeVariant('trial_scheduled')).toBe('secondary');
		expect(statusBadgeVariant('rejected')).toBe('outline');
	});

	it('builds agreement wizard url with optional option id', () => {
		expect(
			buildAgreementWizardUrl({
				requestId: 'req-1',
				studentUserId: 'student-1',
				lessonTypeId: 'lt-1',
				lessonTypeOptionId: 'opt-1',
			}),
		).toBe('/agreements/new?fromRequest=req-1&studentUserId=student-1&lessonTypeId=lt-1&optionId=opt-1');
		expect(
			buildAgreementWizardUrl({
				requestId: 'req-1',
				studentUserId: 'student-1',
				lessonTypeId: 'lt-1',
				lessonTypeOptionId: null,
			}),
		).toBe('/agreements/new?fromRequest=req-1&studentUserId=student-1&lessonTypeId=lt-1');
	});

	it('skips wizard only for group lessons with a group id', () => {
		expect(shouldSkipAgreementWizard(true, 'group-1')).toBe(true);
		expect(shouldSkipAgreementWizard(true, null)).toBe(false);
		expect(shouldSkipAgreementWizard(false, 'group-1')).toBe(false);
	});

	it('maps base signup request row from relations', () => {
		const mapped = mapSignupRequestBaseRow({
			id: 'req-1',
			lesson_types: { id: 'lt-1', name: 'Piano', is_group_lesson: true },
			lesson_groups: { id: 'g-1', name: 'Groep A' },
		} as never);
		expect(mapped.lesson_type_name).toBe('Piano');
		expect(mapped.lesson_group_name).toBe('Groep A');
		expect(mapped.is_group_lesson).toBe(true);
		expect(mapped.option_label).toBeNull();
		expect(mapped.trial_scheduled_date).toBeNull();
		expect(mapped.applicant).toBeNull();
	});

	it('unwraps array relations when mapping base row', () => {
		const mapped = mapSignupRequestBaseRow({
			id: 'req-2',
			lesson_types: [{ id: 'lt-2', name: 'Gitaar', is_group_lesson: false }],
			lesson_groups: null,
		} as never);
		expect(mapped.lesson_type_name).toBe('Gitaar');
		expect(mapped.lesson_group_name).toBeNull();
		expect(mapped.is_group_lesson).toBe(false);
	});
});
