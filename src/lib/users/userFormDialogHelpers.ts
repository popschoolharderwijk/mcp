import type { SubmitUserFormResult } from '@/lib/users/submitUserForm';
import { trimUserFormState, type UserFormState } from '@/lib/users/userFormHelpers';
import type { User } from '@/types/users';

export function handleUserFormDialogOpenChange(
	saving: boolean,
	newOpen: boolean,
	setForm: (form: UserFormState) => void,
	emptyForm: UserFormState,
	onOpenChange: (open: boolean) => void,
): void {
	if (saving) return;
	if (!newOpen) setForm(emptyForm);
	onOpenChange(newOpen);
}

export function buildUserFormStateForOpen(
	user:
		| {
				email: string;
				first_name: string | null;
				last_name: string | null;
				phone_number: string | null;
				role: UserFormState['role'];
		  }
		| undefined,
	emptyForm: UserFormState,
): UserFormState {
	if (!user) return emptyForm;
	return trimUserFormState({
		email: user.email,
		first_name: user.first_name ?? '',
		last_name: user.last_name ?? '',
		phone_number: user.phone_number ?? '',
		role: user.role,
	});
}

export function handleUserFormDialogCancel(
	saving: boolean,
	setForm: (form: UserFormState) => void,
	emptyForm: UserFormState,
	onOpenChange: (open: boolean) => void,
): void {
	if (saving) return;
	setForm(emptyForm);
	onOpenChange(false);
}

function resolveUserFormEditContext(
	isEditMode: boolean,
	editUser: { user_id: string; role: UserFormState['role'] } | undefined,
): { user_id: string; role: UserFormState['role'] } | null {
	if (!isEditMode || !editUser) return null;
	return { user_id: editUser.user_id, role: editUser.role };
}

function applyUserFormDialogSubmitSuccess(params: {
	result: Extract<SubmitUserFormResult, { ok: true }>;
	setForm: (form: UserFormState) => void;
	emptyForm: UserFormState;
	onOpenChange: (open: boolean) => void;
	onSuccess: (createdUser?: User) => void;
}): void {
	const { result, setForm, emptyForm, onOpenChange, onSuccess } = params;

	setForm(emptyForm);
	onOpenChange(false);
	if (result.mode === 'create') {
		onSuccess(result.createdUser);
		return;
	}
	onSuccess();
}

export async function runUserFormDialogSubmit(params: {
	form: UserFormState;
	isSiteAdmin: boolean;
	isEditMode: boolean;
	editUser: { user_id: string; role: UserFormState['role'] } | undefined;
	setForm: (form: UserFormState) => void;
	emptyForm: UserFormState;
	onOpenChange: (open: boolean) => void;
	onSuccess: (createdUser?: User) => void;
	submitUserForm: (
		form: UserFormState,
		isSiteAdmin: boolean,
		editContext: { user_id: string; role: UserFormState['role'] } | null,
	) => Promise<SubmitUserFormResult>;
}): Promise<void> {
	const { form, isSiteAdmin, isEditMode, editUser, setForm, emptyForm, onOpenChange, onSuccess, submitUserForm } =
		params;

	const result = await submitUserForm(form, isSiteAdmin, resolveUserFormEditContext(isEditMode, editUser));
	if (!result.ok) return;

	applyUserFormDialogSubmitSuccess({ result, setForm, emptyForm, onOpenChange, onSuccess });
}
