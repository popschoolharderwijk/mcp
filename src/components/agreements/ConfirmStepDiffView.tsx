import { Card, CardContent } from '@/components/ui/card';
import type { SlotWithStatus } from '@/lib/agreementSlots';
import { resolveConfirmStepPeriodBounds } from '@/lib/agreements/confirmStepDiffViewHelpers';
import { DAY_NAMES } from '@/lib/date/day-index';
import { formatTime } from '@/lib/time/time-format';
import type { WizardInitialAgreement, WizardLessonTypeInfo, WizardTeacherInfo } from '@/types/lesson-agreements';
import type { UserOptional } from '@/types/users';
import {
	ConfirmStudentRow,
	formatWizardPeriodRange,
	isWizardPeriodChanged,
	isWizardSlotChanged,
	isWizardTeacherChanged,
} from './confirmStepShared';
import {
	ConfirmInitialAgreementRows,
	ConfirmSelectedLessonTypeRows,
	ConfirmSlotDiffValue,
	ConfirmStepDiffRow,
	ConfirmTeacherDiffValue,
} from './confirmStepSummaryRows';

interface ConfirmStepDiffViewProps {
	initialAgreement: WizardInitialAgreement;
	loadedPeriod: { start_date: string; end_date: string | null } | null;
	selectedUser: UserOptional | null;
	selectedLessonType: WizardLessonTypeInfo | undefined;
	startDate: string;
	endDate: string;
	selectedTeacherUserId: string | null;
	selectedTeacher: WizardTeacherInfo | undefined;
	effectiveSlot: SlotWithStatus | null;
}

function ConfirmStepCurrentAgreementCard({
	initialAgreement,
	selectedUser,
	periodStart,
	periodEnd,
	startDate,
	endDate,
	selectedTeacherUserId,
	slotChanged,
}: {
	initialAgreement: WizardInitialAgreement;
	selectedUser: UserOptional | null;
	periodStart: string;
	periodEnd: string | null | undefined;
	startDate: string;
	endDate: string;
	selectedTeacherUserId: string | null;
	slotChanged: boolean;
}) {
	return (
		<Card className="border-muted">
			<CardContent className="p-4">
				<p className="mb-3 text-sm font-semibold text-muted-foreground">Huidige overeenkomst</p>
				<ConfirmStudentRow selectedUser={selectedUser} />
				<ConfirmInitialAgreementRows agreement={initialAgreement} />
				<ConfirmStepDiffRow
					label="Periode"
					hideIcon
					changed={isWizardPeriodChanged(periodStart, periodEnd, startDate, endDate)}
					oldValue={formatWizardPeriodRange(periodStart, periodEnd)}
				/>
				<ConfirmStepDiffRow
					label="Docent"
					hideIcon
					changed={isWizardTeacherChanged(initialAgreement.teacher_user_id, selectedTeacherUserId)}
					oldValue={<ConfirmTeacherDiffValue teacher={initialAgreement.teacher} />}
				/>
				<ConfirmStepDiffRow
					label="Tijdslot"
					hideIcon
					changed={slotChanged}
					oldValue={`${DAY_NAMES[initialAgreement.day_of_week]} om ${formatTime(initialAgreement.start_time)}`}
				/>
			</CardContent>
		</Card>
	);
}

function ConfirmStepNewAgreementCard({
	initialAgreement,
	selectedUser,
	selectedLessonType,
	startDate,
	endDate,
	selectedTeacherUserId,
	selectedTeacher,
	effectiveSlot,
	slotChanged,
}: {
	initialAgreement: WizardInitialAgreement;
	selectedUser: UserOptional | null;
	selectedLessonType: WizardLessonTypeInfo | undefined;
	startDate: string;
	endDate: string;
	selectedTeacherUserId: string | null;
	selectedTeacher: WizardTeacherInfo | undefined;
	effectiveSlot: SlotWithStatus | null;
	slotChanged: boolean;
}) {
	return (
		<Card>
			<CardContent className="p-4">
				<p className="mb-3 text-sm font-semibold text-primary">Nieuwe overeenkomst</p>
				<ConfirmStudentRow selectedUser={selectedUser} />
				<ConfirmSelectedLessonTypeRows lessonType={selectedLessonType} />
				<ConfirmStepDiffRow
					label="Periode"
					changed={isWizardPeriodChanged(
						initialAgreement.start_date,
						initialAgreement.end_date,
						startDate,
						endDate,
					)}
					newValue={formatWizardPeriodRange(startDate, endDate)}
				/>
				<ConfirmStepDiffRow
					label="Docent"
					changed={isWizardTeacherChanged(initialAgreement.teacher_user_id, selectedTeacherUserId)}
					newValue={<ConfirmTeacherDiffValue teacher={selectedTeacher} />}
				/>
				<ConfirmStepDiffRow
					label="Tijdslot"
					changed={slotChanged}
					newValue={<ConfirmSlotDiffValue slot={effectiveSlot} />}
				/>
			</CardContent>
		</Card>
	);
}

export function ConfirmStepDiffView({
	initialAgreement,
	loadedPeriod,
	selectedUser,
	selectedLessonType,
	startDate,
	endDate,
	selectedTeacherUserId,
	selectedTeacher,
	effectiveSlot,
}: ConfirmStepDiffViewProps) {
	const { periodStart, periodEnd } = resolveConfirmStepPeriodBounds(initialAgreement, loadedPeriod);
	const slotChanged = isWizardSlotChanged(initialAgreement, effectiveSlot);

	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<ConfirmStepCurrentAgreementCard
				initialAgreement={initialAgreement}
				selectedUser={selectedUser}
				periodStart={periodStart}
				periodEnd={periodEnd}
				startDate={startDate}
				endDate={endDate}
				selectedTeacherUserId={selectedTeacherUserId}
				slotChanged={slotChanged}
			/>
			<ConfirmStepNewAgreementCard
				initialAgreement={initialAgreement}
				selectedUser={selectedUser}
				selectedLessonType={selectedLessonType}
				startDate={startDate}
				endDate={endDate}
				selectedTeacherUserId={selectedTeacherUserId}
				selectedTeacher={selectedTeacher}
				effectiveSlot={effectiveSlot}
				slotChanged={slotChanged}
			/>
		</div>
	);
}
