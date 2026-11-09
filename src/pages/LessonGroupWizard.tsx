import { Navigate } from 'react-router-dom';
import { PartialSlotConfirmDialog } from '@/components/agreements/PartialSlotConfirmDialog';
import { WizardStepIndicator } from '@/components/agreements/WizardStepIndicator';
import { LessonGroupWizardNavigation } from '@/components/lesson-groups/wizard/LessonGroupWizardNavigation';
import {
	LessonGroupStepBody,
	resolveLessonGroupWizardSubtitle,
	resolveLessonGroupWizardTitle,
} from '@/components/lesson-groups/wizard/LessonGroupWizardPageParts';
import { LG_STEPS, type LGStep } from '@/components/lesson-groups/wizard/lessonGroupWizardTypes';
import { PageHeader } from '@/components/ui/page-header';
import { useLessonGroupWizardPage } from '@/hooks/useLessonGroupWizardPage';
import {
	shouldRedirectLessonGroupWizard,
	shouldShowLessonGroupWizardLoading,
} from '@/lib/lesson-groups/lessonGroupWizardShellHelpers';

export default function LessonGroupWizard() {
	const { wizard, pageGate, partialSlotHandlers } = useLessonGroupWizardPage();

	if (shouldShowLessonGroupWizardLoading(pageGate)) {
		return <div className="flex items-center justify-center p-8 text-muted-foreground">Laden...</div>;
	}

	if (shouldRedirectLessonGroupWizard(pageGate)) {
		return <Navigate to="/lesson-groups" replace />;
	}

	return (
		<>
			<div className="mb-6">
				<PageHeader
					title={resolveLessonGroupWizardTitle(wizard.isEditMode, wizard.form.name)}
					subtitle={resolveLessonGroupWizardSubtitle(wizard.isEditMode)}
				/>
			</div>

			<div className="max-w-3xl">
				<WizardStepIndicator<LGStep>
					stepIndex={wizard.stepIndex}
					highestReachedStepIndex={wizard.highestStep}
					onStepChange={wizard.setStep}
					steps={LG_STEPS}
				/>

				<div className="mt-6 rounded-lg border bg-card p-6">
					<LessonGroupStepBody wizard={wizard} />
				</div>

				<LessonGroupWizardNavigation wizard={wizard} />
			</div>

			<PartialSlotConfirmDialog
				open={wizard.partialOpen}
				slot={wizard.form.slot}
				onCancel={partialSlotHandlers.onCancel}
				onConfirm={partialSlotHandlers.onConfirm}
			/>
		</>
	);
}
