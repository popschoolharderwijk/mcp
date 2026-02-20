import { Card, CardContent } from '@/components/ui/card';
import { ExistingOrNewUserSelect } from '@/components/ui/existing-or-new-user-select';
import { Label } from '@/components/ui/label';
import { LessonTypeBadge } from '@/components/ui/lesson-type-badge';
import { type LessonTypeOption, LessonTypeSelect } from '@/components/ui/lesson-type-select';
import { UserDisplay } from '@/components/ui/user-display';
import type { UserOption } from '@/components/ui/users-select';
import { frequencyLabels } from '@/lib/frequencies';
import type { WizardLessonTypeInfo } from '@/types/lesson-agreements';

interface UserStepContentProps {
	isEditMode: boolean;
	selectedStudentUserId: string | null;
	selectedUser: UserOption | null;
	selectedLessonTypeId: string | null;
	selectedLessonType: WizardLessonTypeInfo | undefined;
	lessonTypes: LessonTypeOption[];
	onStudentUserIdChange: (userId: string | null) => void;
	onUserChange: (user: UserOption | null) => void;
	onLessonTypeChange: (lessonTypeId: string | null) => void;
}

export function UserStepContent({
	isEditMode,
	selectedStudentUserId,
	selectedUser,
	selectedLessonTypeId,
	selectedLessonType,
	lessonTypes,
	onStudentUserIdChange,
	onUserChange,
	onLessonTypeChange,
}: UserStepContentProps) {
	if (isEditMode) {
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
									name={`${selectedLessonType.name} (${frequencyLabels[selectedLessonType.frequency]})`}
									icon={selectedLessonType.icon}
									color={selectedLessonType.color}
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

	return (
		<div id="wizard-step-user" className="space-y-6 py-6">
			<ExistingOrNewUserSelect
				value={selectedStudentUserId}
				onChange={(userId, user) => {
					onStudentUserIdChange(userId);
					onUserChange(user);
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
		</div>
	);
}
