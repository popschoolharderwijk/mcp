import type { Dispatch, SetStateAction } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { resolveDeleteAccountToastKind } from '@/lib/account/accountActionsHelpers';
import { persistAccountDelete } from '@/lib/account/persistence';

interface UseAccountActionsParams {
	setDeleting: Dispatch<SetStateAction<boolean>>;
	navigate: NavigateFunction;
}

function showDeleteAccountError(error: string, code?: string): void {
	const toastKind = resolveDeleteAccountToastKind(error, code);
	if (toastKind === 'last-site-admin') {
		toast.error('Kan account niet verwijderen', { description: error });
		return;
	}
	if (toastKind === 'session-expired') {
		toast.error('Sessie verlopen', { description: 'Log opnieuw in en probeer het nogmaals.' });
		return;
	}
	toast.error('Fout bij verwijderen account', { description: error });
}

export function useAccountActions({ setDeleting, navigate }: UseAccountActionsParams) {
	const handleDeleteAccount = async () => {
		setDeleting(true);
		try {
			const { error, code } = await persistAccountDelete();
			if (error) {
				showDeleteAccountError(error, code);
				setDeleting(false);
				return;
			}
			toast.success('Account verwijderd', {
				description: 'Je account en alle bijbehorende gegevens zijn verwijderd.',
			});
			await supabase.auth.signOut();
			navigate('/login');
		} catch (error) {
			console.error('Error deleting account:', error);
			toast.error('Fout bij verwijderen account', {
				description: 'Er is een netwerkfout opgetreden. Probeer het later opnieuw.',
			});
			setDeleting(false);
		}
	};

	return {
		handleDeleteAccount,
	};
}
