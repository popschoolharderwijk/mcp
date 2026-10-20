import { LGStep } from '@/components/lesson-groups/wizard/lessonGroupWizardTypes';
import type { SlotWithStatus } from '@/lib/agreementSlots';

interface StepProceedInput {
	step: LGStep;
	name: string;
	lessonTypeId: string | null;
	durationMinutes: number;
	startDate: string;
	endDate: string;
	teacherUserId: string | null;
	slot: SlotWithStatus | null;
}

export function canProceedFromLessonGroupStep(input: StepProceedInput): boolean {
	if (input.step === LGStep.Basics) {
		return Boolean(
			input.name.trim() &&
				input.lessonTypeId &&
				input.durationMinutes > 0 &&
				input.pricePerLesson >= 0 &&
				input.startDate &&
				input.endDate &&
				new Date(input.endDate) >= new Date(input.startDate),
		);
	}
	if (input.step === LGStep.Teacher) {
		return Boolean(input.teacherUserId && input.slot && input.slot.status !== 'occupied');
	}
	return true;
}

export function teacherStepCanProceed(teacherUserId: string | null, slot: SlotWithStatus | null): boolean {
	return Boolean(teacherUserId && slot && slot.status !== 'occupied');
}
