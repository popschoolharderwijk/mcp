import { AgreementFeeSection } from '@/components/agreements/AgreementFeeSection';
import { ConfirmStepPanel } from '@/components/agreements/ConfirmStepPanel';
import { PeriodStepContent } from '@/components/agreements/PeriodStepContent';
import { TeacherSlotStepContent } from '@/components/agreements/TeacherSlotStepContent';
import { UserStepContent } from '@/components/agreements/UserStepContent';
import type { AgreementWizardState, createWizardFormUpdaters } from '@/components/agreements/wizard/useAgreementWizard';
import type { WizardStepPanelKind } from '@/components/agreements/wizardStepBodyHelpers';

type CurrentAgreementSlot = { day_of_week: number; start_time: string };

type WizardFormUpdaters = ReturnType<typeof createWizardFormUpdaters>;

interface WizardStepPanelProps {
	wizard: AgreementWizardState;
	updaters: WizardFormUpdaters;
	currentAgreementSlot: CurrentAgreementSlot | null;
}

function WizardUserStepPanel({ wizard, updaters }: WizardStepPanelProps) {
	return (
		<UserStepContent
			isEditMode={wizard.isEditMode}
			selectedStudentUserId={wizard.form.studentUserId}
			selectedUser={wizard.form.user}
			selectedLessonTypeId={wizard.form.lessonTypeId}
			selectedLessonType={wizard.selectedLessonType}
			lessonTypes={wizard.lessonTypes.map((lt) => ({
				id: lt.id,
				name: lt.name,
				icon: lt.icon,
				color: lt.color,
			}))}
			lessonTypeOptions={wizard.lessonTypeOptions}
			selectedOptionSnapshot={wizard.form.selectedOptionSnapshot}
			onStudentUserIdChange={updaters.onStudentUserIdChange}
			onUserChange={updaters.onUserChange}
			onLessonTypeChange={updaters.onLessonTypeChange}
			onOptionSnapshotChange={updaters.onOptionSnapshotChange}
			isDuoLesson={wizard.isDuoLesson}
			partnerStudentUserId={wizard.form.partnerStudentUserId}
			partnerUser={wizard.form.partnerUser}
			onPartnerStudentUserIdChange={updaters.onPartnerStudentUserIdChange}
			onPartnerUserChange={updaters.onPartnerUserChange}
		/>
	);
}

function WizardPeriodStepPanel({ wizard, updaters }: WizardStepPanelProps) {
	return (
		<PeriodStepContent
			startDate={wizard.form.startDate}
			endDate={wizard.form.endDate}
			onStartDateChange={updaters.onStartDateChange}
			onEndDateChange={updaters.onEndDateChange}
			startDatePickerRef={wizard.startDatePickerRef}
		/>
	);
}

function WizardTeacherSlotStepPanel({ wizard, updaters, currentAgreementSlot }: WizardStepPanelProps) {
	return (
		<TeacherSlotStepContent
			teachers={wizard.teachers}
			selectedTeacher={wizard.selectedTeacher}
			excludeUserIds={wizard.form.studentUserId ? [wizard.form.studentUserId] : []}
			includeUserIds={wizard.teachers.map((t) => t.userId)}
			slotsWithStatus={wizard.slotsWithStatus}
			selectedSlot={wizard.form.slot}
			currentAgreementSlot={currentAgreementSlot}
			loadingStep3={wizard.loadingSlots}
			isTeacherOwnStudent={wizard.isTeacherOwnStudent}
			onTeacherChange={updaters.onTeacherChange}
			onSlotClick={wizard.handleSlotClick}
		/>
	);
}

function WizardConfirmStepPanel({ wizard, updaters }: WizardStepPanelProps) {
	return (
		<div className="space-y-6">
			<ConfirmStepPanel
				isEditMode={wizard.isEditMode}
				hasChanges={wizard.hasChanges}
				agreement={wizard.agreement}
				loadedPeriod={wizard.loadedPeriod.current}
				selectedUser={wizard.form.user}
				selectedLessonType={wizard.selectedLessonType}
				startDate={wizard.form.startDate}
				endDate={wizard.form.endDate}
				selectedTeacherUserId={wizard.form.teacherUserId}
				selectedTeacher={wizard.selectedTeacher}
				effectiveSlot={wizard.effectiveSlot}
				paymentMethod={wizard.form.paymentMethod}
				sepaMandateId={wizard.form.sepaMandateId}
				studentUserId={wizard.form.studentUserId}
				onPaymentMethodChange={updaters.onPaymentMethodChange}
				onSepaMandateIdChange={updaters.onSepaMandateIdChange}
			/>
			<AgreementFeeSection
				form={wizard.form}
				setForm={wizard.setForm}
				isDuo={wizard.isDuoLesson}
				agreement={wizard.agreement}
			/>
		</div>
	);
}

export const WIZARD_STEP_PANELS: Record<WizardStepPanelKind, (props: WizardStepPanelProps) => JSX.Element> = {
	user: WizardUserStepPanel,
	period: WizardPeriodStepPanel,
	'teacher-slot': WizardTeacherSlotStepPanel,
	confirm: WizardConfirmStepPanel,
};
