import type { Dispatch, SetStateAction } from 'react';
import { LuPlus } from 'react-icons/lu';
import { Button } from '@/components/ui/button';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { PageShell } from '@/components/ui/page-shell';
import { LessonTypeOptionDeleteDialog } from '@/pages/lesson-type-info/LessonTypeOptionDeleteDialog';
import { LessonTypeOptionEditDialog } from '@/pages/lesson-type-info/LessonTypeOptionEditDialog';
import type { OptionModalFormState, OptionRowWithKey } from '@/pages/lesson-type-info/types';

interface LessonTypeOptionsPanelProps {
	sortedOptionsForm: OptionRowWithKey[];
	optionColumns: DataTableColumn<OptionRowWithKey>[];
	getOptionRowKey: (opt: OptionRowWithKey) => string;
	onAddOption: () => void;
	onEditOption: (opt: OptionRowWithKey) => void;
	onDeleteOption: (opt: OptionRowWithKey) => void;
	editingOption: OptionRowWithKey | null;
	onCloseEditModal: () => void;
	optionModalForm: OptionModalFormState;
	setOptionModalForm: Dispatch<SetStateAction<OptionModalFormState>>;
	onSaveOption: () => void;
	optionToDelete: OptionRowWithKey | null;
	onCloseDeleteDialog: () => void;
	onConfirmDelete: () => void;
	saving: boolean;
}

export function LessonTypeOptionsPanel({
	sortedOptionsForm,
	optionColumns,
	getOptionRowKey,
	onAddOption,
	onEditOption,
	onDeleteOption,
	editingOption,
	onCloseEditModal,
	optionModalForm,
	setOptionModalForm,
	onSaveOption,
	optionToDelete,
	onCloseDeleteDialog,
	onConfirmDelete,
	saving,
}: LessonTypeOptionsPanelProps) {
	return (
		<>
			<PageShell
				title="Lesopties"
				actions={
					<Button onClick={onAddOption}>
						<LuPlus className="mr-1 h-4 w-4" />
						Optie toevoegen
					</Button>
				}
			>
				<DataTable<OptionRowWithKey>
					data={sortedOptionsForm}
					columns={optionColumns}
					getRowKey={getOptionRowKey}
					emptyMessage="Nog geen opties. Klik op Optie toevoegen."
					paginated={false}
					initialSortColumn="duration_minutes"
					initialSortDirection="asc"
					rowActions={{
						onEdit: onEditOption,
						onDelete: onDeleteOption,
					}}
					compactRows
				/>
			</PageShell>

			{optionToDelete && (
				<LessonTypeOptionDeleteDialog
					optionToDelete={optionToDelete}
					onClose={onCloseDeleteDialog}
					onConfirm={onConfirmDelete}
					saving={saving}
				/>
			)}

			{editingOption && (
				<LessonTypeOptionEditDialog
					editingOption={editingOption}
					onClose={onCloseEditModal}
					optionModalForm={optionModalForm}
					setOptionModalForm={setOptionModalForm}
					onSave={onSaveOption}
					saving={saving}
				/>
			)}
		</>
	);
}
