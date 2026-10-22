import type { SlotWithStatus } from '@/lib/agreementSlots';
import { APP_SETTINGS_BOOTSTRAP } from '@/lib/settings/appSettingsDefaults';
import type { LessonFrequency } from '@/types/lesson-agreements';
import type { User } from '@/types/users';

export type WizardOptionSnapshot = {
	duration_minutes: number;
	frequency: LessonFrequency;
	price_per_lesson: number;
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
		paymentMethod: APP_SETTINGS_BOOTSTRAP.agreements.default_payment_method,
		sepaMandateId: null,
	};
}
