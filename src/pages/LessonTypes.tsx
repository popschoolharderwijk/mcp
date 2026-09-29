import { LuPlus } from 'react-icons/lu';
import { Navigate, useNavigate } from 'react-router-dom';
import { LessonTypesDeleteDialog } from '@/components/lesson-types/LessonTypesPageParts';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { PageShell } from '@/components/ui/page-shell';
import { NAV_LABELS } from '@/config/nav-labels';
import { useAuth } from '@/hooks/useAuth';
import { useLessonTypesPageController } from '@/hooks/useLessonTypesPageController';

export default function LessonTypes() {
	const navigate = useNavigate();
	const { isAdmin, isSiteAdmin, isLoading: authLoading } = useAuth();
	const hasAccess = isAdmin || isSiteAdmin;

	const controller = useLessonTypesPageController({ authLoading, hasAccess, navigate });

	if (!hasAccess) {
		return <Navigate to="/" replace />;
	}

	return (
		<div>
			<PageShell
				title={NAV_LABELS.lessonTypes}
				description={`Beheer alle ${NAV_LABELS.lessonTypes.toLowerCase()} en hun configuratie`}
				actions={
					<Button onClick={controller.handleCreate}>
						<LuPlus className="mr-2 h-4 w-4" />
						Lessoort toevoegen
					</Button>
				}
			>
				<DataTable
					data={controller.lessonTypes}
					columns={controller.columns}
					searchQuery={controller.searchQuery}
					onSearchChange={controller.setSearchQuery}
					searchFields={[
						(lessonType) => lessonType.name,
						(lessonType) => lessonType.description ?? undefined,
						(lessonType) => lessonType.cost_center ?? undefined,
					]}
					loading={controller.loading}
					getRowKey={(lessonType) => lessonType.id}
					emptyMessage="Geen lessoorten gevonden"
					initialSortColumn="name"
					initialSortDirection="asc"
					rowActions={{
						onEdit: controller.handleEdit,
						onDelete: controller.handleDelete,
					}}
				/>
			</PageShell>

			<LessonTypesDeleteDialog
				deleteDialog={controller.deleteDialog}
				onOpenChange={(open) => !open && controller.setDeleteDialog(null)}
				onConfirm={controller.confirmDelete}
			/>
		</div>
	);
}
