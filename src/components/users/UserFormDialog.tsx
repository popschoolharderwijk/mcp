import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { SubmitButton } from '@/components/ui/submit-button';
import { UserFormFields } from '@/components/users/UserFormFields';
import { useAuth } from '@/hooks/useAuth';
import type { AppRole } from '@/lib/roles';
import { submitUserForm } from '@/lib/users/submitUserForm';
import {
	buildUserFormStateForOpen,
	handleUserFormDialogCancel,
	handleUserFormDialogOpenChange,
	runUserFormDialogSubmit,
} from '@/lib/users/userFormDialogHelpers';
import {
	assignableRoles,
	getUserFormDialogCopy,
	isUserRoleLocked,
	resolveUserFormSubmitDisabled,
	type UserFormState,
} from '@/lib/users/userFormHelpers';
import type { User } from '@/types/users';

interface UserData {
	user_id: string;
	email: string;
	first_name: string | null;
	last_name: string | null;
	phone_number: string | null;
	role: AppRole | null;
}

interface UserFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess: (createdUser?: User) => void;
	user?: UserData;
}

const emptyForm: UserFormState = {
	email: '',
	first_name: '',
	last_name: '',
	phone_number: '',
	role: null,
};

export function UserFormDialog({ open, onOpenChange, onSuccess, user }: UserFormDialogProps) {
	const { isAdmin, isSiteAdmin } = useAuth();
	const isEditMode = !!user;
	const [form, setForm] = useState<UserFormState>(emptyForm);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!open) return;
		setForm(buildUserFormStateForOpen(user, emptyForm));
	}, [open, user]);

	const handleSubmit = async () => {
		setSaving(true);
		try {
			await runUserFormDialogSubmit({
				form,
				isSiteAdmin,
				isEditMode,
				editUser: user,
				setForm,
				emptyForm,
				onOpenChange,
				onSuccess,
				submitUserForm,
			});
		} finally {
			setSaving(false);
		}
	};

	const { dialogTitle, dialogDescription, submitLabel, savingLabel } = getUserFormDialogCopy(isEditMode, form);
	const roleLocked = isUserRoleLocked(isEditMode, isAdmin, isSiteAdmin, user?.role);
	const roles = assignableRoles(isSiteAdmin);
	const initialForm = buildUserFormStateForOpen(user, emptyForm);
	const submitDisabled = resolveUserFormSubmitDisabled(isEditMode, form, initialForm);

	return (
		<Dialog
			open={open}
			onOpenChange={(newOpen) =>
				handleUserFormDialogOpenChange(saving, newOpen, setForm, emptyForm, onOpenChange)
			}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{dialogTitle}</DialogTitle>
					<DialogDescription>{dialogDescription}</DialogDescription>
				</DialogHeader>
				<UserFormFields
					form={form}
					isEditMode={isEditMode}
					roleLocked={roleLocked}
					roles={roles}
					onFieldChange={setForm}
				/>
				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => handleUserFormDialogCancel(saving, setForm, emptyForm, onOpenChange)}
						disabled={saving}
					>
						Annuleren
					</Button>
					<SubmitButton
						variant="default"
						onClick={() => void handleSubmit()}
						loading={saving}
						loadingLabel={savingLabel}
						disabled={submitDisabled}
					>
						{submitLabel}
					</SubmitButton>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
