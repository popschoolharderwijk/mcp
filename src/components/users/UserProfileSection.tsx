import { type ChangeEvent, useEffect, useState } from 'react';
import { AccountProfileAvatarSection } from '@/components/account/AccountProfileAvatarSection';
import { ProfileFormSaveCard } from '@/components/profile/ProfileFormSaveCard';
import { UserFormFields } from '@/components/users/UserFormFields';
import { useAuth } from '@/hooks/useAuth';
import { deleteProfileAvatar, takeAvatarFileFromInput, uploadProfileAvatar } from '@/lib/account/profileAvatarActions';
import { getUserInitials } from '@/lib/user-initials';
import { submitUserForm } from '@/lib/users/submitUserForm';
import { buildUserFormStateForOpen } from '@/lib/users/userFormDialogHelpers';
import {
	assignableRoles,
	emptyUserForm,
	isUserRoleLocked,
	resolveUserFormSubmitDisabled,
	type UserFormState,
} from '@/lib/users/userFormHelpers';
import type { UserWithRole } from '@/lib/users/usersPageHelpers';

interface UserProfileSectionProps {
	user: UserWithRole;
	onUpdate: () => void;
}

export function UserProfileSection({ user, onUpdate }: UserProfileSectionProps) {
	const { isAdmin, isSiteAdmin } = useAuth();
	const [form, setForm] = useState<UserFormState>(() => buildUserFormStateForOpen(user, emptyUserForm));
	const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatar_url);
	const [saving, setSaving] = useState(false);
	const [avatarSaving, setAvatarSaving] = useState(false);

	useEffect(() => {
		setForm(buildUserFormStateForOpen(user, emptyUserForm));
		setAvatarUrl(user.avatar_url);
	}, [user]);

	const initialForm = buildUserFormStateForOpen(user, emptyUserForm);
	const roleLocked = isUserRoleLocked(true, isAdmin, isSiteAdmin, user.role);
	const roles = assignableRoles(isSiteAdmin);
	const saveDisabled = resolveUserFormSubmitDisabled(true, form, initialForm);

	const onSave = async () => {
		setSaving(true);
		try {
			const result = await submitUserForm(form, isSiteAdmin, {
				user_id: user.user_id,
				role: user.role,
			});
			if (result.ok) onUpdate();
		} finally {
			setSaving(false);
		}
	};

	const onUploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = takeAvatarFileFromInput(event);
		if (!file) return;
		setAvatarSaving(true);
		const result = await uploadProfileAvatar(user.user_id, file);
		if (result.ok) {
			setAvatarUrl(result.avatarUrl);
			onUpdate();
		}
		setAvatarSaving(false);
	};

	const onDeleteAvatar = async () => {
		setAvatarSaving(true);
		if (await deleteProfileAvatar(user.user_id)) {
			setAvatarUrl(null);
			onUpdate();
		}
		setAvatarSaving(false);
	};

	const initials = getUserInitials({
		first_name: form.first_name,
		last_name: form.last_name,
		email: form.email,
	});

	return (
		<ProfileFormSaveCard
			title="Persoonlijke gegevens"
			saving={saving || avatarSaving}
			onSave={() => void onSave()}
			disabled={saveDisabled}
		>
			<UserFormFields
				form={form}
				isEditMode
				roleLocked={roleLocked}
				roles={roles}
				onFieldChange={setForm}
				avatar={
					<AccountProfileAvatarSection
						profile={{ avatar_url: avatarUrl }}
						userInitials={initials}
						saving={saving || avatarSaving}
						onUploadAvatar={(e) => void onUploadAvatar(e)}
						onDeleteAvatar={() => void onDeleteAvatar()}
					/>
				}
			/>
		</ProfileFormSaveCard>
	);
}
