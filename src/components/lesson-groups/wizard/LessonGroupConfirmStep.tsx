import type { LessonGroupWizardState } from '@/components/lesson-groups/wizard/useLessonGroupWizard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { LessonTypeBadge } from '@/components/ui/lesson-type-badge';
import { UserDisplay } from '@/components/ui/user-display';
import { formatDbDateToUi } from '@/lib/date/date-format';
import {
	formatLessonGroupPeriodText,
	formatLessonGroupScheduleText,
	resolveLessonGroupMembersDisplay,
	resolveLessonGroupNameDisplay,
	resolveLessonGroupTeacherProfile,
} from '@/lib/lesson-groups/lessonGroupConfirmStepHelpers';

interface LessonGroupConfirmStepProps {
	wizard: LessonGroupWizardState;
}

function ConfirmRow({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className="flex flex-col gap-1 border-b border-border py-2 last:border-0">
			<span className="text-xs font-medium text-muted-foreground">{label}</span>
			<div className="text-sm">{value}</div>
		</div>
	);
}

function LessonGroupMembersSummary({ memberCount }: { memberCount: number }) {
	const membersDisplay = resolveLessonGroupMembersDisplay(memberCount);
	if (membersDisplay.kind === 'empty') {
		return <span className="text-muted-foreground">{membersDisplay.label}</span>;
	}
	return <Badge variant="secondary">{membersDisplay.label}</Badge>;
}

function LessonGroupTeacherSummary({ wizard }: { wizard: LessonGroupWizardState }) {
	const teacherProfile = resolveLessonGroupTeacherProfile(wizard.selectedTeacher);
	if (!teacherProfile) return <>-</>;
	return <UserDisplay profile={teacherProfile} showEmail />;
}

export function LessonGroupConfirmStep({ wizard }: LessonGroupConfirmStepProps) {
	const { form, formUpdaters, isEditMode, selectedLessonType } = wizard;
	const scheduleText = formatLessonGroupScheduleText(form.slot, form.durationMinutes, form.frequency);
	const periodText = formatLessonGroupPeriodText(form.startDate, form.endDate, formatDbDateToUi);

	return (
		<div className="space-y-4">
			<Card>
				<CardContent className="space-y-3 p-4 text-sm">
					<ConfirmRow
						label="Naam"
						value={<span className="font-medium">{resolveLessonGroupNameDisplay(form.name)}</span>}
					/>
					<ConfirmRow
						label="Lessoort"
						value={selectedLessonType ? <LessonTypeBadge lessonType={selectedLessonType} /> : '-'}
					/>
					<ConfirmRow label="Schema" value={<span>{scheduleText}</span>} />
					<ConfirmRow label="Periode" value={periodText} />
					<ConfirmRow label="Docent" value={<LessonGroupTeacherSummary wizard={wizard} />} />
					<ConfirmRow
						label={`Leerlingen (${form.memberIds.length})`}
						value={<LessonGroupMembersSummary memberCount={form.memberIds.length} />}
					/>
				</CardContent>
			</Card>

			{!isEditMode && (
				<label className="flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						checked={form.scheduleInAgenda}
						onChange={(e) => formUpdaters.setScheduleInAgenda(e.target.checked)}
						className="h-4 w-4 rounded border-input"
					/>
					Direct inplannen in de agenda als terugkerende afspraak
				</label>
			)}
		</div>
	);
}
