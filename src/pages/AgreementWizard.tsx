import { AgreementWizardPageHeader } from '@/components/agreements/AgreementWizardPageHeader';
import { PartialSlotConfirmDialog } from '@/components/agreements/PartialSlotConfirmDialog';
import { WizardNavigation } from '@/components/agreements/WizardNavigation';
import { WizardStepBody } from '@/components/agreements/WizardStepBody';
import { type WizardStep, WizardStepIndicator } from '@/components/agreements/WizardStepIndicator';
import { useAgreementWizard } from '@/components/agreements/wizard/useAgreementWizard';
import { SubscriptionCard } from '@/components/subscriptions/SubscriptionCard';
import { useAuth } from '@/hooks/useAuth';
import { shouldShowSubscriptionCard } from '@/lib/subscriptions/subscriptionCardHelpers';

export default function AgreementWizard() {
	const wizard = useAgreementWizard();
	const { isPrivileged } = useAuth();

	if (wizard.loadingAgreement) {
		return (
			<div className="flex items-center justify-center p-8">
				<div className="text-muted-foreground">Laden...</div>
			</div>
		);
	}

	return (
		<>
			<AgreementWizardPageHeader isEditMode={wizard.isEditMode} agreement={wizard.agreement} />

			<WizardStepIndicator<WizardStep>
				step={wizard.step}
				stepIndex={wizard.stepIndex}
				highestReachedStepIndex={wizard.highestStep}
				onStepChange={wizard.setStep}
			/>

			<div className="mt-6 max-w-2xl rounded-lg border bg-card p-6">
				<WizardStepBody wizard={wizard} />
			</div>

			<WizardNavigation wizard={wizard} />

			{wizard.agreement && shouldShowSubscriptionCard(wizard.isEditMode, isPrivileged, wizard.agreement.payment_method) && (
				<SubscriptionCard
					lessonAgreementId={wizard.agreement.id}
					studentUserId={wizard.agreement.student_user_id}
				/>
			)}

			<PartialSlotConfirmDialog
				open={wizard.partialConfirmOpen}
				slot={wizard.form.slot}
				onCancel={() => wizard.setPartialConfirmOpen(false)}
				onConfirm={() => wizard.setPartialConfirmOpen(false)}
			/>
		</>
	);
}
