import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getInvokeErrorMessage } from '@/lib/auth/invokeError';
import type { AppRole } from '@/lib/roles';
import { resolveUserRoleUpdateAction } from '@/lib/users/submitUserFormHelpers';
import {
	buildCreatedUserInfo,
	buildCreateUserPayload,
	buildProfileUpdatePayload,
	type UserFormEditContext,
	type UserFormState,
	validateUserFormSubmit,
} from '@/lib/users/userFormHelpers';
import type { User } from '@/types/users';

export type SubmitUserFormResult =
	| { ok: true; mode: 'edit' }
	| { ok: true; mode: 'create'; createdUser: User }
	| { ok: false };

async function runUserRoleMutation(
	errorTitle: string,
	run: () => PromiseLike<{ error: { message: string } | null }>,
): Promise<boolean> {
	const { error } = await run();
	if (error) {
		toast.error(errorTitle, { description: error.message });
		return false;
	}
	return true;
}

async function updateUserRole(userId: string, newRole: AppRole | null, currentRole: AppRole | null): Promise<boolean> {
	const action = resolveUserRoleUpdateAction(newRole, currentRole);
	if (action === 'skip') return true;

	if (action === 'delete') {
		return runUserRoleMutation('Fout bij bijwerken rol', () =>
			supabase.from('user_roles').delete().eq('user_id', userId),
		);
	}

	if (action === 'insert' && newRole) {
		return runUserRoleMutation('Fout bij toewijzen rol', () =>
			supabase.from('user_roles').insert({ user_id: userId, role: newRole }),
		);
	}

	if (action === 'update' && newRole) {
		return runUserRoleMutation('Fout bij bijwerken rol', () =>
			supabase.from('user_roles').update({ role: newRole }).eq('user_id', userId),
		);
	}

	return true;
}

async function submitUserEdit(form: UserFormState, user: UserFormEditContext): Promise<SubmitUserFormResult> {
	const { error: profileError } = await supabase
		.from('profiles')
		.update(buildProfileUpdatePayload(form))
		.eq('user_id', user.user_id);

	if (profileError) {
		toast.error('Fout bij bijwerken gebruiker', { description: profileError.message });
		return { ok: false };
	}

	const roleOk = await updateUserRole(user.user_id, form.role, user.role);
	if (!roleOk) return { ok: false };

	toast.success('Gebruiker bijgewerkt');
	return { ok: true, mode: 'edit' };
}

async function submitUserCreate(form: UserFormState, isSiteAdmin: boolean): Promise<SubmitUserFormResult> {
	const { data, error: invokeError } = await supabase.functions.invoke('create-user', {
		body: buildCreateUserPayload(form),
	});

	if (invokeError) {
		const errorMessage = await getInvokeErrorMessage(invokeError, { isSiteAdmin });
		toast.error('Fout bij aanmaken gebruiker', { description: errorMessage });
		return { ok: false };
	}

	if (data?.error) {
		toast.error('Fout bij aanmaken gebruiker', { description: data.error });
		return { ok: false };
	}

	if (data?.warning) {
		toast.warning('Gebruiker aangemaakt', { description: data.warning });
	} else {
		toast.success('Gebruiker aangemaakt', {
			description: `Gebruiker ${form.email} is succesvol aangemaakt.`,
		});
	}

	return { ok: true, mode: 'create', createdUser: buildCreatedUserInfo(form, data) };
}

export async function submitUserForm(
	form: UserFormState,
	isSiteAdmin: boolean,
	editContext: UserFormEditContext | null,
): Promise<SubmitUserFormResult> {
	const validation = validateUserFormSubmit(form, isSiteAdmin);
	if (validation.ok === false) {
		toast.error(validation.message, validation.description ? { description: validation.description } : undefined);
		return { ok: false };
	}

	if (editContext) {
		return submitUserEdit(form, editContext);
	}

	return submitUserCreate(form, isSiteAdmin);
}
