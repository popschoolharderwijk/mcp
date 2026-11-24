import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { AgreementTableRow } from '@/types/lesson-agreements';

export type AgreementAction =
	| { kind: 'edit'; agreement: AgreementTableRow }
	| { kind: 'delete'; agreement: AgreementTableRow }
	| { kind: 'confirm-delete' };

type AgreementRunActionKind = 'navigate-edit' | 'open-delete' | 'confirm-delete';

export interface AgreementPageActionSetters {
	navigate: (path: string) => void;
	setDeleteDialog: (value: { open: boolean; agreement: AgreementTableRow } | null) => void;
	reloadAgreements: () => void;
}

function resolveAgreementRunActionKind(action: AgreementAction): AgreementRunActionKind {
	if (action.kind === 'edit') return 'navigate-edit';
	if (action.kind === 'delete') return 'open-delete';
	return 'confirm-delete';
}

async function executeAgreementDelete(
	agreementId: string,
	setters: Pick<AgreementPageActionSetters, 'setDeleteDialog' | 'reloadAgreements'>,
): Promise<void> {
	const { error } = await supabase.from('lesson_agreements').delete().eq('id', agreementId);
	if (error) {
		toast.error('Fout bij verwijderen overeenkomst', { description: error.message });
		throw new Error(error.message);
	}

	toast.success('Overeenkomst verwijderd');
	setters.setDeleteDialog(null);
	setters.reloadAgreements();
}

export async function runAgreementPageAction(
	action: AgreementAction,
	deleteDialog: { open: boolean; agreement: AgreementTableRow | null } | null,
	setters: AgreementPageActionSetters,
): Promise<void> {
	const resolved = resolveAgreementRunActionKind(action);

	if (resolved === 'navigate-edit' && action.kind === 'edit') {
		setters.navigate(`/agreements/${action.agreement.id}`);
		return;
	}

	if (resolved === 'open-delete' && action.kind === 'delete') {
		setters.setDeleteDialog({ open: true, agreement: action.agreement });
		return;
	}

	if (!deleteDialog?.agreement) return;

	await executeAgreementDelete(deleteDialog.agreement.id, setters);
}
