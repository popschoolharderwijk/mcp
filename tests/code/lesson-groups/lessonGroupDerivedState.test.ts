import { describe, expect, it } from 'bun:test';
import {
	canProceedFromLessonGroupStep,
	teacherStepCanProceed,
} from '../../../src/components/lesson-groups/wizard/lessonGroupDerivedState';
import { LGStep } from '../../../src/components/lesson-groups/wizard/lessonGroupWizardTypes';
import type { SlotWithStatus } from '../../../src/lib/agreementSlots';

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

function baseInput(overrides: Partial<Parameters<typeof canProceedFromLessonGroupStep>[0]> = {}) {
	return {
		step: LGStep.Basics,
		name: 'Groep A',
		lessonTypeId: 'lt-1',
		durationMinutes: 45,
		startDate: '2026-09-01',
		endDate: '2027-07-31',
		teacherUserId: 'teacher-1',
		slot: freeSlot(),
		...overrides,
	};
}

describe('canProceedFromLessonGroupStep', () => {
	it('requires basics fields on the basics step', () => {
		expect(canProceedFromLessonGroupStep(baseInput({ name: '  ' }))).toBe(false);
		expect(canProceedFromLessonGroupStep(baseInput({ lessonTypeId: null }))).toBe(false);
		expect(canProceedFromLessonGroupStep(baseInput({ durationMinutes: 0 }))).toBe(false);
		expect(canProceedFromLessonGroupStep(baseInput({ endDate: '2026-08-01' }))).toBe(false);
		expect(canProceedFromLessonGroupStep(baseInput())).toBe(true);
	});

	it('requires teacher and free slot on the teacher step', () => {
		expect(
			canProceedFromLessonGroupStep(
				baseInput({
					step: LGStep.Teacher,
					teacherUserId: null,
				}),
			),
		).toBe(false);
		expect(
			canProceedFromLessonGroupStep(
				baseInput({
					step: LGStep.Teacher,
					slot: freeSlot({ status: 'occupied' }),
				}),
			),
		).toBe(false);
		expect(canProceedFromLessonGroupStep(baseInput({ step: LGStep.Teacher }))).toBe(true);
	});

	it('allows proceeding on other steps', () => {
		expect(canProceedFromLessonGroupStep(baseInput({ step: LGStep.Members }))).toBe(true);
	});
});

describe('teacherStepCanProceed', () => {
	it('requires a teacher and a free slot', () => {
		expect(teacherStepCanProceed('teacher-1', freeSlot())).toBe(true);
		expect(teacherStepCanProceed(null, freeSlot())).toBe(false);
		expect(teacherStepCanProceed('teacher-1', freeSlot({ status: 'occupied' }))).toBe(false);
	});
});
