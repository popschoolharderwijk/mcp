import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { FormDialogFooter } from '@/components/ui/form-dialog-footer';

export interface CrudFormDialogActionsProps {
	onCancel: () => void;
	onSave: () => void;
	saving: boolean;
	disabled?: boolean;
	isEditing: boolean;
	deleteOpen: boolean;
	onDeleteOpenChange: (open: boolean) => void;
	onDeleteConfirm: () => void | Promise<void>;
	deleteTitle: string;
	deleteDescription: string;
}

/** Footer for the create/edit dialog. Pair with CrudFormDeleteConfirmDialog outside that Dialog. */
export function CrudFormDialogActions({ onCancel, onSave, saving, disabled, isEditing }: CrudFormDialogActionsProps) {
	return (
		<FormDialogFooter
			onCancel={onCancel}
			onSave={onSave}
			saving={saving}
			disabled={disabled}
			isEditing={isEditing}
		/>
	);
}

/** Must sit outside the edit Dialog so row-level delete still mounts when the editor is closed. */
export function CrudFormDeleteConfirmDialog({
	deleteOpen,
	onDeleteOpenChange,
	onDeleteConfirm,
	deleteTitle,
	deleteDescription,
}: CrudFormDialogActionsProps) {
	return (
		<ConfirmDeleteDialog
			open={deleteOpen}
			onOpenChange={onDeleteOpenChange}
			onConfirm={async () => {
				await onDeleteConfirm();
			}}
			title={deleteTitle}
			description={deleteDescription}
		/>
	);
}
