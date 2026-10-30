import { ConfirmStepContent } from '@/components/agreements/ConfirmStepContent';
import type { SlotWithStatus } from '@/lib/agreementSlots';
import { getConfirmStepHeading, getConfirmStepSubtitle } from '@/lib/agreements/confirmStepPanelHelpers';
import type { AgreementTableRow, WizardLessonTypeInfo, WizardTeacherInfo } from '@/types/lesson-agreements';
import type { User } from '@/types/users';

interface ConfirmStepPanelProps {
	isEditMode: boolean;
	hasChanges: boolean;
	agreement: AgreementTableRow | null;
	loadedPeriod: { start_date: string; end_date: string | null } | null;
	selectedUser: User | null;
	selectedLessonType: WizardLessonTypeInfo | undefined;
	startDate: string;
	endDate: string;
	selectedTeacherUserId: string | null;
	selectedTeacher: WizardTeacherInfo | undefined;
	effectiveSlot: SlotWithStatus | null;
}

export function ConfirmStepPanel({
	isEditMode,
	hasChanges,
	agreement,
	loadedPeriod,
	selectedUser,
	selectedLessonType,
	startDate,
	endDate,
	selectedTeacherUserId,
	selectedTeacher,
	effectiveSlot,
}: ConfirmStepPanelProps) {
	const subtitle = getConfirmStepSubtitle(isEditMode, hasChanges);

	return (
		<div className="space-y-6">
			<div className="text-center mb-4">
				<h3 className="text-lg font-semibold">{getConfirmStepHeading(hasChanges)}</h3>
				{subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
			</div>
			<ConfirmStepContent
				isEditMode={isEditMode}
				hasChanges={hasChanges}
				initialAgreement={agreement}
				loadedPeriod={loadedPeriod}
				selectedUser={selectedUser}
				selectedLessonType={selectedLessonType}
				startDate={startDate}
				endDate={endDate}
				selectedTeacherUserId={selectedTeacherUserId}
				selectedTeacher={selectedTeacher}
				effectiveSlot={effectiveSlot}
			/>
		</div>
	);
}
