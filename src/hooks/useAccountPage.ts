import { useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { useAccountActions } from '@/hooks/useAccountActions';
import { useAccountPageProfileLoad } from '@/hooks/useAccountPageProfileLoad';
import { useAuth } from '@/hooks/useAuth';
import {
	type AccountTab,
	buildAccountPageUserInitials,
	createInitialAccountFormData,
	resolveAccountTabRoute,
} from '@/lib/account/accountPageControllerHelpers';
import { buildAccountPageViewModel, resetAccountDeleteDialogState } from '@/lib/account/accountPageShellHelpers';
import type { AccountFormErrors, AccountProfileState } from '@/lib/account/persistence';

export type { AccountTab };

export const TAB_TITLES: Record<AccountTab, string> = {
	profile: 'Profiel',
	appearance: 'Weergave',
	security: 'Beveiliging',
	danger: 'Account',
};

export function navigateToAccountTab(navigate: NavigateFunction, tab: AccountTab): void {
	navigate(resolveAccountTabRoute(tab), { replace: true });
}

export function useAccountPage(navigate: NavigateFunction) {
	const { user } = useAuth();
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [profile, setProfile] = useState<AccountProfileState | null>(null);
	const [formData, setFormData] = useState(createInitialAccountFormData);
	const [errors, setErrors] = useState<AccountFormErrors>({});
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
	const [deleting, setDeleting] = useState(false);

	useAccountPageProfileLoad({
		userId: user?.id,
		setProfile,
		setFormData,
		setLoading,
	});

	const { handleSaveProfile, handleUploadAvatar, handleDeleteAvatar, handleDeleteAccount } = useAccountActions({
		user,
		profile,
		formData,
		setProfile,
		setSaving,
		setDeleting,
		setErrors,
		navigate,
	});

	const userInitials = buildAccountPageUserInitials(user, profile);

	const closeDeleteDialog = () => {
		const reset = resetAccountDeleteDialogState();
		setDeleteDialogOpen(reset.deleteDialogOpen);
		setDeleteConfirmEmail(reset.deleteConfirmEmail);
	};

	const viewModel = buildAccountPageViewModel({
		user,
		loading,
		saving,
		profile,
		formData,
		errors,
		deleteDialogOpen,
		deleteConfirmEmail,
		deleting,
		userInitials,
	});

	return {
		...viewModel,
		setFormData,
		setErrors,
		setDeleteDialogOpen,
		setDeleteConfirmEmail,
		handleSaveProfile,
		handleUploadAvatar,
		handleDeleteAvatar,
		handleDeleteAccount,
		closeDeleteDialog,
	};
}
