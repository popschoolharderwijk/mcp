import type { SlotWithStatus } from '@/lib/agreementSlots';
import type { LessonFrequency } from '@/types/lesson-agreements';
import type { User } from '@/types/users';

export type WizardOptionSnapshot = {
	id: string;
	duration_minutes: number;
	frequency: LessonFrequency;
	label?: string | null;
};

export type WizardFormState = {
	studentUserId: string | null;
	user: User | null;
	lessonTypeId: string | null;
	selectedOptionSnapshot: WizardOptionSnapshot | null;
	startDate: string;
	endDate: string;
	teacherUserId: string | null;
	slot: SlotWithStatus | null;
	partnerStudentUserId: string | null;
	partnerUser: User | null;
	paymentMethod: 'stripe' | 'sepa' | 'manual';
	sepaMandateId: string | null;
	/** Date of birth as stored (null = unknown); the input below fills it in. */
	studentDateOfBirth: string | null;
	partnerDateOfBirth: string | null;
	/** Entered in the wizard when the stored date is missing; saved on the student after creation. */
	studentDateOfBirthInput: string;
	partnerDateOfBirthInput: string;
};

export function createInitialWizardForm(defaultStartDate: string, defaultEndDate: string): WizardFormState {
	return {
		studentUserId: null,
		user: null,
		lessonTypeId: null,
		selectedOptionSnapshot: null,
		startDate: defaultStartDate,
		endDate: defaultEndDate,
		teacherUserId: null,
		slot: null,
		partnerStudentUserId: null,
		partnerUser: null,
		paymentMethod: 'sepa',
		sepaMandateId: null,
		studentDateOfBirth: null,
		partnerDateOfBirth: null,
		studentDateOfBirthInput: '',
		partnerDateOfBirthInput: '',
	};
}
