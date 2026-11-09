import type { SlotWithStatus } from '@/lib/agreementSlots';

export function isWizardSaveDisabled(params: {
	slot: SlotWithStatus | null;
	saving: boolean;
	isTeacherOwnStudent: boolean;
	isEditMode: boolean;
	hasChanges: boolean;
}): boolean {
	return (
		!params.slot ||
		params.slot.status === 'occupied' ||
		params.saving ||
		params.isTeacherOwnStudent ||
		(params.isEditMode && !params.hasChanges)
	);
}

export function isWizardNextEnabled(stepIndex: number, highestStep: number, stepCanProceed: boolean): boolean {
	return stepIndex < highestStep || stepCanProceed;
}

export function getWizardPrimaryButtonLabel(isLastStep: boolean, saving: boolean, isEditMode: boolean): string {
	if (!isLastStep) return 'Volgende';
	if (saving) return 'Opslaan...';
	return isEditMode ? 'Opslaan' : 'Bevestigen';
}
