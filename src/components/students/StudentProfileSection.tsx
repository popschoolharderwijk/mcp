import type { ChangeEvent } from 'react';
import { useState } from 'react';
import { AccountProfileAvatarSection } from '@/components/account/AccountProfileAvatarSection';
import { ProfileFormSaveCard } from '@/components/profile/ProfileFormSaveCard';
import { StudentFormPersonalSection } from '@/components/students/StudentFormPersonalSection';
import type { StudentFormFieldsViewModel } from '@/components/students/studentFormFieldsViewModel';
import { deleteProfileAvatar, takeAvatarFileFromInput, uploadProfileAvatar } from '@/lib/account/profileAvatarActions';
import { getUserInitials } from '@/lib/user-initials';
import type { Student } from '@/types/students';

interface StudentProfileSectionProps {
	student: Student;
	vm: StudentFormFieldsViewModel;
	saving: boolean;
	onSave: () => void;
	onProfileUpdate: () => void;
	canEdit?: boolean;
	saveDisabled?: boolean;
	onDateOfBirthDraftSyncedChange?: (synced: boolean) => void;
}

export function StudentProfileSection({
	student,
	vm,
	saving,
	onSave,
	onProfileUpdate,
	canEdit = true,
	saveDisabled = false,
	onDateOfBirthDraftSyncedChange,
}: StudentProfileSectionProps) {
	const [avatarSaving, setAvatarSaving] = useState(false);
	const initials = getUserInitials(student);

	const onUploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = takeAvatarFileFromInput(event);
		if (!file) return;
		setAvatarSaving(true);
		const result = await uploadProfileAvatar(student.user_id, file);
		if (result.ok) onProfileUpdate();
		setAvatarSaving(false);
	};

	const onDeleteAvatar = async () => {
		setAvatarSaving(true);
		if (await deleteProfileAvatar(student.user_id)) onProfileUpdate();
		setAvatarSaving(false);
	};

	return (
		<ProfileFormSaveCard
			title="Persoonlijke gegevens"
			saving={saving || avatarSaving}
			onSave={onSave}
			canEdit={canEdit}
			disabled={saveDisabled}
		>
			<StudentFormPersonalSection
				vm={vm}
				canEdit={canEdit}
				onDateOfBirthDraftSyncedChange={onDateOfBirthDraftSyncedChange}
				avatar={
					canEdit ? (
						<AccountProfileAvatarSection
							profile={{ avatar_url: student.avatar_url }}
							userInitials={initials}
							saving={saving || avatarSaving}
							onUploadAvatar={(e) => void onUploadAvatar(e)}
							onDeleteAvatar={() => void onDeleteAvatar()}
						/>
					) : undefined
				}
			/>
		</ProfileFormSaveCard>
	);
}
