import { useEffect, useMemo, useState } from 'react';
import type { useLessonGroupEditLoad } from '@/components/lesson-groups/wizard/lessonGroupDataHooks';
import {
	canProceedFromLessonGroupStep,
	teacherStepCanProceed,
} from '@/components/lesson-groups/wizard/lessonGroupDerivedState';
import { createLessonGroupFormUpdaters } from '@/components/lesson-groups/wizard/lessonGroupFormUpdaters';
import {
	lessonGroupDefaultEndDate,
	lessonGroupDefaultStartDate,
} from '@/components/lesson-groups/wizard/lessonGroupWizardDateDefaults';
import {
	type LessonGroupFormState,
	LG_STEP_ORDER,
	LGStep,
} from '@/components/lesson-groups/wizard/lessonGroupWizardTypes';

function createInitialForm(defaultStart: string, defaultEnd: string): LessonGroupFormState {
	return {
		name: '',
		lessonTypeId: null,
		durationMinutes: 60,
		frequency: 'weekly',
		startDate: defaultStart,
		endDate: defaultEnd,
		teacherUserId: null,
		slot: null,
		memberIds: [],
		selectedRequestIds: [],
		scheduleInAgenda: true,
	};
}

export function useLessonGroupForm(initial: ReturnType<typeof useLessonGroupEditLoad>['initial']) {
	const defaultStartDate = lessonGroupDefaultStartDate();
	const defaultEndDate = lessonGroupDefaultEndDate();
	const [form, setForm] = useState<LessonGroupFormState>(() => createInitialForm(defaultStartDate, defaultEndDate));

	useEffect(() => {
		if (!initial) return;
		setForm((f) => ({
			...f,
			name: initial.name,
			lessonTypeId: initial.lessonTypeId,
			durationMinutes: initial.durationMinutes,
			frequency: initial.frequency,
			startDate: initial.startDate,
			endDate: initial.endDate,
			teacherUserId: initial.teacherUserId,
			slot: initial.slot,
			memberIds: initial.memberIds,
			scheduleInAgenda: false,
		}));
	}, [initial]);

	const formUpdaters = useMemo(() => createLessonGroupFormUpdaters(setForm), []);

	return { form, setForm, formUpdaters };
}

export function useLessonGroupWizardSteps(form: LessonGroupFormState, initialLoaded: boolean) {
	const [step, setStep] = useState<LGStep>(LGStep.Basics);
	const [highestStep, setHighestStep] = useState(0);

	useEffect(() => {
		if (!initialLoaded) return;
		setHighestStep(LG_STEP_ORDER.length - 1);
		setStep(LGStep.Confirm);
	}, [initialLoaded]);

	const stepIndex = LG_STEP_ORDER.indexOf(step);
	const isFirst = stepIndex === 0;
	const isLast = stepIndex === LG_STEP_ORDER.length - 1;

	const stepCanProceed = canProceedFromLessonGroupStep({
		step,
		name: form.name,
		lessonTypeId: form.lessonTypeId,
		durationMinutes: form.durationMinutes,
		startDate: form.startDate,
		endDate: form.endDate,
		teacherUserId: form.teacherUserId,
		slot: form.slot,
	});

	const teacherStepReady = teacherStepCanProceed(form.teacherUserId, form.slot);

	const goNext = () => {
		if (isLast) return;
		const next = stepIndex + 1;
		setStep(LG_STEP_ORDER[next]);
		if (next > highestStep) setHighestStep(next);
	};

	const goPrev = () => {
		if (!isFirst) setStep(LG_STEP_ORDER[stepIndex - 1]);
	};

	return {
		step,
		setStep,
		stepIndex,
		highestStep,
		isFirst,
		isLast,
		stepCanProceed,
		teacherStepReady,
		goNext,
		goPrev,
	};
}
