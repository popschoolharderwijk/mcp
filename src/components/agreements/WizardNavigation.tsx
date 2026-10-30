import type { AgreementWizardState } from '@/components/agreements/wizard/useAgreementWizard';
import {
	getWizardPrimaryButtonLabel,
	isWizardNextEnabled,
	isWizardSaveDisabled,
} from '@/components/agreements/wizardNavigationUiHelpers';
import { Button } from '@/components/ui/button';

interface WizardNavigationProps {
	wizard: AgreementWizardState;
}

export function WizardNavigation({ wizard }: WizardNavigationProps) {
	const saveDisabled = isWizardSaveDisabled({
		slot: wizard.form.slot,
		saving: wizard.saving,
		isTeacherOwnStudent: wizard.isTeacherOwnStudent,
		isEditMode: wizard.isEditMode,
		hasChanges: wizard.hasChanges,
	});
	const nextEnabled = isWizardNextEnabled(wizard.stepIndex, wizard.highestStep, wizard.stepCanProceed);
	const primaryLabel = getWizardPrimaryButtonLabel(wizard.isLastStep, wizard.saving, wizard.isEditMode);

	return (
		<div className="mt-6 flex justify-between gap-2">
			{!wizard.isFirstStep && (
				<Button variant="outline" onClick={wizard.prevStep}>
					Vorige
				</Button>
			)}
			<div className="flex-1" />
			{!wizard.isLastStep ? (
				<Button onClick={wizard.nextStep} disabled={!nextEnabled}>
					{primaryLabel}
				</Button>
			) : (
				<Button onClick={wizard.handleSave} disabled={saveDisabled}>
					{primaryLabel}
				</Button>
			)}
		</div>
	);
}
