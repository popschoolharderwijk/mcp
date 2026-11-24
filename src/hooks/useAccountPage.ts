import { useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { useAccountActions } from '@/hooks/useAccountActions';
import { useAuth } from '@/hooks/useAuth';
import { type AccountTab, resolveAccountTabRoute } from '@/lib/account/accountPageControllerHelpers';

export type { AccountTab };

export const TAB_TITLES: Record<AccountTab, string> = {
	appearance: 'Weergave',
	security: 'Beveiliging',
	danger: 'Account',
};

export function navigateToAccountTab(navigate: NavigateFunction, tab: AccountTab): void {
	navigate(resolveAccountTabRoute(tab), { replace: true });
}

export function useAccountPage(navigate: NavigateFunction) {
	const { user } = useAuth();
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
	const [deleting, setDeleting] = useState(false);

	const { handleDeleteAccount } = useAccountActions({
		setDeleting,
		navigate,
	});

	const closeDeleteDialog = () => {
		setDeleteDialogOpen(false);
		setDeleteConfirmEmail('');
	};

	return {
		user,
		loading: false,
		deleteDialogOpen,
		setDeleteDialogOpen,
		deleteConfirmEmail,
		setDeleteConfirmEmail,
		deleting,
		handleDeleteAccount,
		closeDeleteDialog,
	};
}
