import { LuUsers } from 'react-icons/lu';
import { LessonTypeOptionSelect, type OptionSnapshot } from '@/components/lesson-type-options/LessonTypeOptionSelect';
import { Card, CardContent } from '@/components/ui/card';
import { ExistingOrNewUserSelect } from '@/components/ui/existing-or-new-user-select';
import { Label } from '@/components/ui/label';
import { LessonTypeBadge } from '@/components/ui/lesson-type-badge';
import { type LessonTypeOption, LessonTypeSelect } from '@/components/ui/lesson-type-select';
import { UserDisplay } from '@/components/ui/user-display';
import { hasDuplicateDuoPartner, mapSelectedUserIds } from '@/lib/agreements/userStepSectionsHelpers';
import { frequencyLabels } from '@/lib/frequencies';
import type { LessonTypeOptionSnapshot, WizardLessonTypeInfo } from '@/types/lesson-agreements';
import type { User } from '@/types/users';

interface UserStepEditContentProps {
	selectedUser: User | null;
	selectedLessonType: WizardLessonTypeInfo | undefined;
}

export function UserStepEditContent({ selectedUser, selectedLessonType }: UserStepEditContentProps) {
	return (
		<div id="wizard-step-user" className="space-y-6 py-6">
			<div className="space-y-3">
				<Label className="text-base">Leerling</Label>
				<div className="opacity-60">
					{selectedUser ? (
						<UserDisplay
							profile={{
								first_name: selectedUser.first_name,
								last_name: selectedUser.last_name,
								email: selectedUser.email,
								avatar_url: selectedUser.avatar_url,
							}}
							showEmail
						/>
					) : (
						<p className="text-muted-foreground">-</p>
					)}
				</div>
			</div>
			<div className="space-y-3">
				<Label className="text-base">Lessoort</Label>
				{selectedLessonType ? (
					<Card className="opacity-60">
						<CardContent className="flex min-w-0 items-center gap-3 p-3">
							<LessonTypeBadge
								lessonType={{
									name: `${selectedLessonType.name} · ${selectedLessonType.duration_minutes} min · ${frequencyLabels[selectedLessonType.frequency]}`,
									icon: selectedLessonType.icon,
									color: selectedLessonType.color,
								}}
							/>
						</CardContent>
					</Card>
				) : (
					<p className="text-muted-foreground">-</p>
				)}
			</div>
		</div>
	);
}

interface UserStepDuoPartnerSectionProps {
	partnerStudentUserId: string | null;
	selectedStudentUserId: string | null;
	partnerUser: User | null;
	onPartnerStudentUserIdChange?: (userId: string | null) => void;
	onPartnerUserChange?: (user: User | null) => void;
}

function UserStepDuoPartnerSection({
	partnerStudentUserId,
	selectedStudentUserId,
	partnerUser,
	onPartnerStudentUserIdChange,
	onPartnerUserChange,
}: UserStepDuoPartnerSectionProps) {
	const hasDuplicatePartner = hasDuplicateDuoPartner(partnerStudentUserId, selectedStudentUserId, partnerUser);

	return (
		<div className="space-y-3 rounded-md border border-dashed border-primary/40 bg-primary/5 p-4">
			<div className="flex items-center gap-2 text-sm font-medium text-primary">
				<LuUsers className="h-4 w-4" />
				Duo-les: kies een tweede leerling
			</div>
			<p className="text-xs text-muted-foreground">
				Beide leerlingen krijgen een eigen overeenkomst en betaaluitnodiging, maar volgen samen één les op
				hetzelfde tijdslot.
			</p>
			<ExistingOrNewUserSelect
				value={partnerStudentUserId}
				onChange={(user) => {
					const selected = mapSelectedUserIds(user);
					onPartnerStudentUserIdChange?.(selected.userId);
					onPartnerUserChange?.(selected.user);
				}}
				filter="all"
				excludeUserIds={selectedStudentUserId ? [selectedStudentUserId] : []}
				placeholder="Selecteer duo-partner..."
				label="Duo-partner"
			/>
			{hasDuplicatePartner && (
				<p className="text-xs text-destructive">
					De duo-partner moet een andere leerling zijn dan de hoofdleerling.
				</p>
			)}
		</div>
	);
}

export interface UserStepCreateContentProps {
	selectedStudentUserId: string | null;
	selectedLessonTypeId: string | null;
	lessonTypes: LessonTypeOption[];
	lessonTypeOptions: LessonTypeOptionSnapshot[];
	selectedOptionSnapshot: OptionSnapshot | null;
	onStudentUserIdChange: (userId: string | null) => void;
	onUserChange: (user: User | null) => void;
	onLessonTypeChange: (lessonTypeId: string | null) => void;
	onOptionSnapshotChange: (snap: OptionSnapshot | null) => void;
	isDuoLesson: boolean;
	partnerStudentUserId: string | null;
	partnerUser: User | null;
	onPartnerStudentUserIdChange?: (userId: string | null) => void;
	onPartnerUserChange?: (user: User | null) => void;
}

export function UserStepCreateContent({
	selectedStudentUserId,
	selectedLessonTypeId,
	lessonTypes,
	lessonTypeOptions,
	selectedOptionSnapshot,
	onStudentUserIdChange,
	onUserChange,
	onLessonTypeChange,
	onOptionSnapshotChange,
	isDuoLesson,
	partnerStudentUserId,
	partnerUser,
	onPartnerStudentUserIdChange,
	onPartnerUserChange,
}: UserStepCreateContentProps) {
	return (
		<div id="wizard-step-user" className="space-y-6 py-6">
			<ExistingOrNewUserSelect
				value={selectedStudentUserId}
				onChange={(user) => {
					const selected = mapSelectedUserIds(user);
					onStudentUserIdChange(selected.userId);
					onUserChange(selected.user);
				}}
				filter="all"
				placeholder="Selecteer bestaande gebruiker..."
				label="Leerling"
			/>
			<div className="space-y-3">
				<Label className="text-base">Lessoort</Label>
				<LessonTypeSelect
					options={lessonTypes}
					value={selectedLessonTypeId}
					onChange={onLessonTypeChange}
					placeholder="Selecteer lessoort..."
				/>
			</div>
			{selectedLessonTypeId && lessonTypeOptions.length > 0 && (
				<div className="space-y-3">
					<Label className="text-base">Optie (duur, frequentie, prijs)</Label>
					<LessonTypeOptionSelect
						options={lessonTypeOptions}
						value={selectedOptionSnapshot}
						onChange={onOptionSnapshotChange}
					/>
				</div>
			)}
			{isDuoLesson && (
				<UserStepDuoPartnerSection
					partnerStudentUserId={partnerStudentUserId}
					selectedStudentUserId={selectedStudentUserId}
					partnerUser={partnerUser}
					onPartnerStudentUserIdChange={onPartnerStudentUserIdChange}
					onPartnerUserChange={onPartnerUserChange}
				/>
			)}
		</div>
	);
}
