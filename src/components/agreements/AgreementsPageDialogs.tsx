import { LuPlus } from 'react-icons/lu';
import type { NavigateFunction } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import {
	buildAgreementDeleteDescription,
	buildAgreementDeleteDialogOpenChangeHandler,
	buildAgreementsNewPath,
} from '@/lib/agreements/agreementsPageShellHelpers';
import { getDisplayName } from '@/lib/display-name';
import type { AgreementTableRow } from '@/types/lesson-agreements';

interface AgreementsPageDialogsProps {
	deleteDialog: { open: boolean; agreement: AgreementTableRow | null } | null;
	setDeleteDialog: (value: { open: boolean; agreement: AgreementTableRow | null } | null) => void;
	onConfirmDelete: () => Promise<void>;
}

export function AgreementsPageDialogs({ deleteDialog, setDeleteDialog, onConfirmDelete }: AgreementsPageDialogsProps) {
	if (!deleteDialog) return null;

	const student = buildAgreementDeleteDescription(deleteDialog.agreement);

	return (
		<ConfirmDeleteDialog
			open={deleteDialog.open}
			onOpenChange={buildAgreementDeleteDialogOpenChangeHandler(setDeleteDialog)}
			title="Overeenkomst verwijderen"
			description={
				<>
					Weet je zeker dat je de lesovereenkomst van <strong>{getDisplayName(student)}</strong> wilt
					verwijderen? Deze actie kan niet ongedaan worden gemaakt.
					<p className="mt-2 text-muted-foreground">
						Alle gegevens van deze overeenkomst worden permanent verwijderd.
					</p>
				</>
			}
			onConfirm={onConfirmDelete}
		/>
	);
}

export function AgreementsPageCreateButton({
	navigate,
	studentUserId,
}: {
	navigate: NavigateFunction;
	studentUserId?: string | null;
}) {
	return (
		<Button onClick={() => navigate(buildAgreementsNewPath(studentUserId))}>
			<LuPlus className="mr-2 h-4 w-4" />
			Overeenkomst toevoegen
		</Button>
	);
}
