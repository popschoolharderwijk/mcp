import type { AccountFormData, AccountFormErrors, AccountProfileState } from '@/lib/account/persistence';

export interface AccountPageViewModel {
	user: { id: string; email?: string | null } | null;
	loading: boolean;
	saving: boolean;
	profile: AccountProfileState | null;
	formData: AccountFormData;
	errors: AccountFormErrors;
	deleteDialogOpen: boolean;
	deleteConfirmEmail: string;
	deleting: boolean;
	userInitials: string;
}

export function buildAccountPageViewModel(params: AccountPageViewModel): AccountPageViewModel {
	return params;
}

export function resetAccountDeleteDialogState(): { deleteDialogOpen: false; deleteConfirmEmail: '' } {
	return { deleteDialogOpen: false, deleteConfirmEmail: '' };
}
