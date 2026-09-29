import { LuPlus } from 'react-icons/lu';
import type { NavigateFunction } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { DataTable } from '@/components/ui/data-table';
import { PageShell } from '@/components/ui/page-shell';
import { NAV_LABELS } from '@/config/nav-labels';
import type { LessonGroupTableRow } from '@/lib/lesson-groups/lessonGroupsPageHelpers';
import { buildLessonGroupColumns, LessonGroupRowActions } from '@/lib/lesson-groups/lessonGroupsTableColumns';
import type { LessonGroupRow } from '@/types/lesson-groups';

interface LessonGroupsTableProps {
	rows: LessonGroupTableRow[];
	loading: boolean;
	search: string;
	onSearchChange: (value: string) => void;
	canEdit: boolean;
	navigate: NavigateFunction;
	onSchedule: (group: LessonGroupTableRow) => void;
	onDeleteRequest: (group: LessonGroupRow) => void;
}

export function LessonGroupsTable({
	rows,
	loading,
	search,
	onSearchChange,
	canEdit,
	navigate,
	onSchedule,
	onDeleteRequest,
}: LessonGroupsTableProps) {
	const columns = buildLessonGroupColumns(navigate);

	return (
		<PageShell
			title={NAV_LABELS.lessonGroups}
			description="Beheer lesgroepen en hun deelnemers"
			actions={
				canEdit ? (
					<Button onClick={() => navigate('/lesson-groups/new')}>
						<LuPlus className="mr-2 h-4 w-4" />
						Nieuwe lesgroep
					</Button>
				) : undefined
			}
		>
			<DataTable
				data={rows}
				columns={columns}
				searchQuery={search}
				onSearchChange={onSearchChange}
				searchFields={[(group) => group.name, (group) => group.lesson_type_name]}
				loading={loading}
				getRowKey={(group) => group.id}
				emptyMessage="Geen lesgroepen gevonden"
				initialSortColumn="name"
				initialSortDirection="asc"
				rowActions={{
					onEdit: canEdit ? (group) => navigate(`/lesson-groups/${group.id}`) : undefined,
					render: canEdit
						? (group) => (
								<LessonGroupRowActions
									group={group}
									onSchedule={onSchedule}
									onDelete={onDeleteRequest}
								/>
							)
						: undefined,
				}}
			/>
		</PageShell>
	);
}

interface LessonGroupDeleteDialogProps {
	group: LessonGroupRow | null;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => Promise<void>;
}

export function LessonGroupDeleteDialog({ group, onOpenChange, onConfirm }: LessonGroupDeleteDialogProps) {
	if (!group) return null;
	return (
		<ConfirmDeleteDialog
			open
			onOpenChange={onOpenChange}
			title="Lesgroep verwijderen"
			description={
				<>
					Weet je zeker dat je <strong>{group.name}</strong> wilt verwijderen? Alle bijbehorende
					agenda-afspraken worden ook verwijderd.
				</>
			}
			onConfirm={onConfirm}
		/>
	);
}
