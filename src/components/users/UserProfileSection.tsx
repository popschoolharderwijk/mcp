import { useEffect, useState } from 'react';
import { ProfileFormSaveCard } from '@/components/profile/ProfileFormSaveCard';
import { UserFormFields } from '@/components/users/UserFormFields';
import { useAuth } from '@/hooks/useAuth';
import { submitUserForm } from '@/lib/users/submitUserForm';
import { buildUserFormStateForOpen } from '@/lib/users/userFormDialogHelpers';
import { assignableRoles, emptyUserForm, isUserRoleLocked, type UserFormState } from '@/lib/users/userFormHelpers';
import type { UserWithRole } from '@/lib/users/usersPageHelpers';

interface UserProfileSectionProps {
	user: UserWithRole;
	onUpdate: () => void;
}

export function UserProfileSection({ user, onUpdate }: UserProfileSectionProps) {
	const { isAdmin, isSiteAdmin } = useAuth();
	const [form, setForm] = useState<UserFormState>(() => buildUserFormStateForOpen(user, emptyUserForm));
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		setForm(buildUserFormStateForOpen(user, emptyUserForm));
	}, [user]);

	const roleLocked = isUserRoleLocked(true, isAdmin, isSiteAdmin, user.role);
	const roles = assignableRoles(isSiteAdmin);

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

	return (
		<ProfileFormSaveCard title="Gegevens" saving={saving} onSave={() => void onSave()}>
			<UserFormFields form={form} isEditMode roleLocked={roleLocked} roles={roles} onFieldChange={setForm} />
		</ProfileFormSaveCard>
	);
}
