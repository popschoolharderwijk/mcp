import {
	UserStepCreateContent,
	type UserStepCreateContentProps,
	UserStepEditContent,
} from '@/components/agreements/UserStepSections';
import type { WizardLessonTypeInfo } from '@/types/lesson-agreements';
import type { User } from '@/types/users';

type UserStepContentProps = {
	isEditMode: boolean;
	selectedUser: User | null;
	selectedLessonType: WizardLessonTypeInfo | undefined;
} & Omit<UserStepCreateContentProps, 'isDuoLesson' | 'partnerStudentUserId' | 'partnerUser'> & {
		isDuoLesson?: UserStepCreateContentProps['isDuoLesson'];
		partnerStudentUserId?: UserStepCreateContentProps['partnerStudentUserId'];
		partnerUser?: UserStepCreateContentProps['partnerUser'];
	};

export function UserStepContent({
	isEditMode,
	selectedStudentUserId,
	selectedUser,
	selectedLessonTypeId,
	selectedLessonType,
	lessonTypes,
	lessonTypeOptions,
	selectedOptionSnapshot,
	onStudentUserIdChange,
	onUserChange,
	onLessonTypeChange,
	onOptionSnapshotChange,
	isDuoLesson = false,
	partnerStudentUserId = null,
	partnerUser = null,
	onPartnerStudentUserIdChange,
	onPartnerUserChange,
}: UserStepContentProps) {
	if (isEditMode) {
		return <UserStepEditContent selectedUser={selectedUser} selectedLessonType={selectedLessonType} />;
	}

	return (
		<UserStepCreateContent
			selectedStudentUserId={selectedStudentUserId}
			selectedLessonTypeId={selectedLessonTypeId}
			lessonTypes={lessonTypes}
			lessonTypeOptions={lessonTypeOptions}
			selectedOptionSnapshot={selectedOptionSnapshot}
			onStudentUserIdChange={onStudentUserIdChange}
			onUserChange={onUserChange}
			onLessonTypeChange={onLessonTypeChange}
			onOptionSnapshotChange={onOptionSnapshotChange}
			isDuoLesson={isDuoLesson}
			partnerStudentUserId={partnerStudentUserId}
			partnerUser={partnerUser}
			onPartnerStudentUserIdChange={onPartnerStudentUserIdChange}
			onPartnerUserChange={onPartnerUserChange}
		/>
	);
}
