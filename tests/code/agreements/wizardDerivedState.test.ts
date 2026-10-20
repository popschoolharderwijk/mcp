import { describe, expect, it } from 'bun:test';
import { WizardStep } from '../../../src/components/agreements/WizardStepIndicator';
import {
	buildEffectiveSlot,
	buildSelectedLessonType,
	buildSelectedTeacher,
	canProceedFromStep,
	computeHasChanges,
	isDuoLessonType,
} from '../../../src/components/agreements/wizard/wizardDerivedState';
import type { WizardFormState } from '../../../src/components/agreements/wizard/wizardFormTypes';
import type { SlotWithStatus } from '../../../src/lib/agreementSlots';
import type { AgreementTableRow, WizardTeacherInfo } from '../../../src/types/lesson-agreements';

function mockAgreementRow(overrides: Partial<AgreementTableRow> = {}): AgreementTableRow {
	return {
		id: 'agr-1',
		day_of_week: 1,
		start_time: '09:00:00',
		start_date: '2026-09-01',
		end_date: '2027-07-31',
		is_active: true,
		student_user_id: 'stu-1',
		lesson_type_id: 'lt-1',
		duration_minutes: 60,
		frequency: 'weekly',
		price_per_lesson: 30,
		created_at: '2026-01-01T00:00:00Z',
		notes: null,
		payment_method: 'stripe',
		sepa_mandate_id: null,
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

function freeSlot(overrides: Partial<SlotWithStatus> = {}): SlotWithStatus {
	return {
		day_of_week: 1,
		start_time: '09:00',
		end_time: '10:00',
		status: 'free',
		totalOccurrences: 10,
		occupiedOccurrences: 0,
		...overrides,
	};
}

function baseForm(overrides: Partial<WizardFormState> = {}): WizardFormState {
	return {
		studentUserId: 'stu-1',
		user: null,
		lessonTypeId: 'lt-1',
		selectedOptionSnapshot: { id: 'opt-1', duration_minutes: 45, frequency: 'weekly' },
		startDate: '2026-09-01',
		endDate: '2027-07-31',
		teacherUserId: 'tea-1',
		slot: freeSlot(),
		partnerStudentUserId: null,
		partnerUser: null,
		paymentMethod: 'stripe',
		sepaMandateId: null,
		studentDateOfBirth: null,
		partnerDateOfBirth: null,
		studentDateOfBirthInput: '',
		partnerDateOfBirthInput: '',
		...overrides,
	};
}

const teacherFromList: WizardTeacherInfo = {
	id: 'tea-1',
	userId: 'tea-1',
	firstName: 'Piet',
	lastName: 'Docent',
	email: 'piet@example.com',
	avatarUrl: null,
};

describe('buildSelectedLessonType', () => {
	it('returns lesson type fields from an existing agreement', () => {
		const agreement = mockAgreementRow();
		expect(buildSelectedLessonType(agreement, undefined, null)).toEqual({
			id: 'lt-1',
			name: 'Piano',
			icon: 'piano',
			color: '#000000',
			duration_minutes: 60,
			frequency: 'weekly',
			price_per_lesson: 30,
			lesson_type_option_id: null,
		});
	});

	it('returns lesson type from matched type and option snapshot when creating', () => {
		const matched = { id: 'lt-2', name: 'Gitaar', icon: 'guitar', color: '#ff0000' };
		const snapshot = { id: 'opt-2', duration_minutes: 45, frequency: 'biweekly' as const };
		expect(buildSelectedLessonType(null, matched, snapshot)).toEqual({
			id: 'lt-2',
			name: 'Gitaar',
			icon: 'guitar',
			color: '#ff0000',
			duration_minutes: 45,
			frequency: 'biweekly',
			price_per_lesson: null,
			lesson_type_option_id: 'opt-2',
		});
	});

	it('returns undefined when matched type or snapshot is missing', () => {
		const matched = { id: 'lt-2', name: 'Gitaar', icon: 'guitar', color: '#ff0000' };
		expect(buildSelectedLessonType(null, matched, null)).toBeUndefined();
		expect(buildSelectedLessonType(null, undefined, null)).toBeUndefined();
	});
});

describe('buildSelectedTeacher', () => {
	it('returns the teacher from the loaded teachers list', () => {
		const teachers = [teacherFromList, { ...teacherFromList, id: 'tea-2', userId: 'tea-2' }];
		expect(buildSelectedTeacher(teachers, 'tea-1', null)).toEqual(teacherFromList);
	});

	it('falls back to agreement teacher when the teachers list is empty', () => {
		const agreement = mockAgreementRow();
		expect(buildSelectedTeacher([], 'tea-1', agreement)).toEqual({
			id: 'tea-1',
			userId: '',
			firstName: 'Piet',
			lastName: 'Docent',
			email: 'piet@example.com',
			avatarUrl: null,
		});
	});

	it('returns undefined when no teachers are available', () => {
		expect(buildSelectedTeacher([], 'tea-1', null)).toBeUndefined();
		expect(buildSelectedTeacher([], 'tea-1', mockAgreementRow({ teacher: undefined }))).toBeUndefined();
	});
});

describe('buildEffectiveSlot', () => {
	it('returns the selected slot when present', () => {
		const slot = freeSlot({ day_of_week: 3, start_time: '14:00' });
		expect(buildEffectiveSlot(slot, mockAgreementRow())).toEqual(slot);
	});

	it('builds a slot from agreement day and start time when no slot is selected', () => {
		expect(buildEffectiveSlot(null, mockAgreementRow({ day_of_week: 2, start_time: '10:30:00' }))).toEqual({
			day_of_week: 2,
			start_time: '10:30:00',
			end_time: '10:30:00',
			status: 'free',
			occupiedOccurrences: 0,
			totalOccurrences: 0,
		});
	});

	it('returns null when neither slot nor agreement day is available', () => {
		expect(buildEffectiveSlot(null, null)).toBeNull();
		expect(buildEffectiveSlot(null, mockAgreementRow({ day_of_week: null as unknown as number }))).toBeNull();
	});
});

describe('computeHasChanges', () => {
	it('returns false when there is no agreement', () => {
		expect(computeHasChanges(null, baseForm(), freeSlot())).toBe(false);
	});

	it('returns false when form matches the agreement', () => {
		const agreement = mockAgreementRow();
		const form = baseForm({
			startDate: agreement.start_date,
			endDate: agreement.end_date ?? '',
			teacherUserId: agreement.teacher_user_id,
			paymentMethod: 'stripe',
			sepaMandateId: null,
		});
		const slot = freeSlot({ day_of_week: agreement.day_of_week, start_time: '09:00' });
		expect(computeHasChanges(agreement, form, slot)).toBe(false);
	});

	it('detects start date changes', () => {
		const agreement = mockAgreementRow();
		const form = baseForm({ startDate: '2026-10-01' });
		expect(computeHasChanges(agreement, form, freeSlot())).toBe(true);
	});

	it('detects teacher changes', () => {
		const agreement = mockAgreementRow();
		const form = baseForm({ teacherUserId: 'tea-2' });
		expect(computeHasChanges(agreement, form, freeSlot())).toBe(true);
	});

	it('detects slot day and time changes', () => {
		const agreement = mockAgreementRow();
		const form = baseForm();
		const slot = freeSlot({ day_of_week: 4, start_time: '11:00' });
		expect(computeHasChanges(agreement, form, slot)).toBe(true);
	});

	it('detects sepa mandate changes when payment method is sepa', () => {
		const agreement = mockAgreementRow({ payment_method: 'sepa', sepa_mandate_id: 'mandate-1' });
		const form = baseForm({ paymentMethod: 'sepa', sepaMandateId: 'mandate-2' });
		expect(computeHasChanges(agreement, form, freeSlot())).toBe(true);
	});
});

describe('isDuoLessonType', () => {
	it('returns false in edit mode regardless of lesson type', () => {
		const lessonTypes = [{ id: 'lt-duo', is_duo_lesson: true }];
		expect(isDuoLessonType(true, lessonTypes, 'lt-duo')).toBe(false);
	});

	it('returns true when the selected lesson type is a duo lesson', () => {
		const lessonTypes = [
			{ id: 'lt-solo', is_duo_lesson: false },
			{ id: 'lt-duo', is_duo_lesson: true },
		];
		expect(isDuoLessonType(false, lessonTypes, 'lt-duo')).toBe(true);
	});

	it('returns false when the selected lesson type is not a duo lesson', () => {
		const lessonTypes = [{ id: 'lt-solo', is_duo_lesson: false }];
		expect(isDuoLessonType(false, lessonTypes, 'lt-solo')).toBe(false);
		expect(isDuoLessonType(false, lessonTypes, null)).toBe(false);
	});
});

describe('canProceedFromStep', () => {
	it('requires student, lesson type, and option snapshot on the user step', () => {
		const form = baseForm();
		expect(canProceedFromStep(WizardStep.User, form, false, false, false)).toBe(true);
		expect(canProceedFromStep(WizardStep.User, baseForm({ studentUserId: null }), false, false, false)).toBe(false);
		expect(
			canProceedFromStep(WizardStep.User, baseForm({ selectedOptionSnapshot: null }), false, false, false),
		).toBe(false);
	});

	it('allows edit mode on the user step without an option snapshot', () => {
		const form = baseForm({ selectedOptionSnapshot: null });
		expect(canProceedFromStep(WizardStep.User, form, true, false, false)).toBe(true);
	});

	it('requires a distinct partner on the user step for duo lessons', () => {
		const form = baseForm({ partnerStudentUserId: 'stu-2' });
		expect(canProceedFromStep(WizardStep.User, form, false, true, false)).toBe(true);
		expect(
			canProceedFromStep(WizardStep.User, baseForm({ partnerStudentUserId: 'stu-1' }), false, true, false),
		).toBe(false);
		expect(canProceedFromStep(WizardStep.User, baseForm({ partnerStudentUserId: null }), false, true, false)).toBe(
			false,
		);
	});

	it('requires a valid date range on the period step', () => {
		expect(canProceedFromStep(WizardStep.Period, baseForm(), false, false, false)).toBe(true);
		expect(canProceedFromStep(WizardStep.Period, baseForm({ endDate: '2026-08-01' }), false, false, false)).toBe(
			false,
		);
		expect(canProceedFromStep(WizardStep.Period, baseForm({ startDate: '' }), false, false, false)).toBe(false);
	});

	it('requires a free slot and disallows teacher-own-student on the teacher step', () => {
		expect(canProceedFromStep(WizardStep.TeacherSlot, baseForm(), false, false, false)).toBe(true);
		expect(
			canProceedFromStep(
				WizardStep.TeacherSlot,
				baseForm({ slot: freeSlot({ status: 'occupied' }) }),
				false,
				false,
				false,
			),
		).toBe(false);
		expect(canProceedFromStep(WizardStep.TeacherSlot, baseForm({ slot: null }), false, false, false)).toBe(false);
		expect(canProceedFromStep(WizardStep.TeacherSlot, baseForm(), false, false, true)).toBe(false);
	});

	it('always allows proceeding from the confirm step', () => {
		expect(canProceedFromStep(WizardStep.Confirm, baseForm(), false, false, false)).toBe(true);
	});
});
