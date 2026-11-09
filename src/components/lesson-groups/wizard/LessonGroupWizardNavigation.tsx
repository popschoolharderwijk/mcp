import {
	isWizardNextEnabled,
	resolveWizardNavLeftAction,
	resolveWizardNavRightAction,
	resolveWizardSubmitLabel,
} from '@/components/lesson-groups/wizard/lessonGroupWizardNavigationHelpers';
import type { LessonGroupWizardState } from '@/components/lesson-groups/wizard/useLessonGroupWizard';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';

interface LessonGroupWizardNavigationProps {
	wizard: LessonGroupWizardState;
}

export function LessonGroupWizardNavigation({ wizard }: LessonGroupWizardNavigationProps) {
	const {
		isFirst,
		isLast,
		goPrev,
		goNext,
		handleSave,
		saving,
		stepIndex,
		highestStep,
		stepCanProceed,
		teacherStepReady,
		navigate,
	} = wizard;

	const leftAction = resolveWizardNavLeftAction(isFirst);
	const rightAction = resolveWizardNavRightAction(isLast);

	return (
		<div className="mt-6 flex justify-between gap-2">
			{leftAction === 'prev' ? (
				<Button variant="outline" onClick={goPrev}>
					Vorige
				</Button>
			) : (
				<Button variant="outline" onClick={() => navigate('/lesson-groups')}>
					Annuleren
				</Button>
			)}
			<div className="flex-1" />
			{rightAction === 'next' ? (
				<Button onClick={goNext} disabled={!isWizardNextEnabled(stepIndex, highestStep, stepCanProceed)}>
					Volgende
				</Button>
			) : (
				<SubmitButton onClick={handleSave} loading={saving} disabled={!teacherStepReady}>
					{resolveWizardSubmitLabel(wizard.isEditMode)}
				</SubmitButton>
			)}
		</div>
	);
}
