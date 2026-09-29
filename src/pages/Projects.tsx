import { LuPlus, LuSettings } from 'react-icons/lu';
import { Navigate } from 'react-router-dom';
import { ProjectAgendaEvents } from '@/components/projects/ProjectAgendaEvents';
import { ProjectDomainsManager } from '@/components/projects/ProjectDomainsManager';
import { ProjectFormDialog } from '@/components/projects/ProjectFormDialog';
import { ProjectLabelsManager } from '@/components/projects/ProjectLabelsManager';
import { Button } from '@/components/ui/button';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { DataTable } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageShell } from '@/components/ui/page-shell';
import { NAV_LABELS } from '@/config/nav-labels';
import { useAuth } from '@/hooks/useAuth';
import { useProjectsPageController } from '@/hooks/useProjectsPageController';
import { PROJECT_COLUMNS, type ProjectAction } from '@/lib/projects/projectsPageHelpers';
import {
	buildProjectsRowActions,
	resolveProjectAgendaCanSchedule,
	resolveProjectsPagePermissions,
} from '@/lib/projects/projectsPageViewHelpers';
import type { ProjectRow } from '@/types/projects';

interface ProjectsHeaderActionsProps {
	canEdit: boolean;
	runAction: (action: ProjectAction) => void;
	setSettingsModalOpen: (open: boolean) => void;
}

function ProjectsHeaderActions({ canEdit, runAction, setSettingsModalOpen }: ProjectsHeaderActionsProps) {
	if (!canEdit) return undefined;

	return (
		<div className="flex items-center gap-2">
			<Button onClick={() => runAction({ kind: 'create' })}>
				<LuPlus className="mr-2 h-4 w-4" />
				Project toevoegen
			</Button>
			<Button
				variant="outline"
				size="icon"
				onClick={() => setSettingsModalOpen(true)}
				aria-label="Domeinen en labels beheren"
			>
				<LuSettings className="h-4 w-4" />
			</Button>
		</div>
	);
}

interface ProjectsDeleteDialogProps {
	deleteDialog: { open: boolean; project: ProjectRow | null } | null;
	setDeleteDialog: (value: null) => void;
	runAction: (action: ProjectAction) => void;
}

function ProjectsDeleteDialog({ deleteDialog, setDeleteDialog, runAction }: ProjectsDeleteDialogProps) {
	if (!deleteDialog) return null;

	return (
		<ConfirmDeleteDialog
			open={deleteDialog.open}
			onOpenChange={(open) => !open && setDeleteDialog(null)}
			title="Project verwijderen"
			description={
				<>
					Weet je zeker dat je <strong>{deleteDialog.project?.name}</strong> wilt verwijderen? Deze actie kan
					niet ongedaan worden gemaakt.
				</>
			}
			onConfirm={async () => {
				runAction({ kind: 'confirm-delete' });
			}}
		/>
	);
}

export default function Projects() {
	const { isAdmin, isSiteAdmin, isPrivileged, isTeacher, isLoading: authLoading } = useAuth();
	const permissions = resolveProjectsPagePermissions(isTeacher, isPrivileged, isAdmin, isSiteAdmin);

	const {
		projects,
		loading,
		searchQuery,
		setSearchQuery,
		formDialog,
		setFormDialog,
		deleteDialog,
		setDeleteDialog,
		settingsModalOpen,
		setSettingsModalOpen,
		expandedProjectId,
		setExpandedProjectId,
		refetchLabelsRef,
		loadProjects,
		runAction,
	} = useProjectsPageController({ authLoading, canView: permissions.canView });

	if (!permissions.canView) {
		return <Navigate to="/" replace />;
	}

	const rowActions = buildProjectsRowActions(permissions.canEdit, runAction);

	return (
		<div>
			<PageShell
				title={NAV_LABELS.projects}
				description={`Beheer alle ${NAV_LABELS.projects.toLowerCase()}`}
				actions={
					<ProjectsHeaderActions
						canEdit={permissions.canEdit}
						runAction={runAction}
						setSettingsModalOpen={setSettingsModalOpen}
					/>
				}
			>
				<DataTable
					data={projects}
					columns={PROJECT_COLUMNS}
					searchQuery={searchQuery}
					onSearchChange={setSearchQuery}
					searchFields={[
						(p) => p.name,
						(p) => p.description ?? undefined,
						(p) => p.cost_center ?? undefined,
						(p) => p.domain_name,
						(p) => p.label_name,
					]}
					loading={loading}
					getRowKey={(p) => p.id}
					emptyMessage="Geen projecten gevonden"
					initialSortColumn="name"
					initialSortDirection="asc"
					expandedRowKey={expandedProjectId}
					onExpandToggle={setExpandedProjectId}
					renderExpandedRow={(project) => (
						<ProjectAgendaEvents
							projectId={project.id}
							canSchedule={resolveProjectAgendaCanSchedule(permissions.canSchedule, project.is_active)}
						/>
					)}
					rowActions={rowActions}
				/>
			</PageShell>

			<ProjectFormDialog
				open={formDialog.open}
				onOpenChange={(open) => !open && setFormDialog({ open: false, project: null })}
				project={formDialog.project}
				onSaved={loadProjects}
			/>

			<ProjectsDeleteDialog deleteDialog={deleteDialog} setDeleteDialog={setDeleteDialog} runAction={runAction} />

			<Dialog open={settingsModalOpen} onOpenChange={setSettingsModalOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Domeinen &amp; labels</DialogTitle>
					</DialogHeader>
					<div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
						<ProjectDomainsManager onDomainsChange={() => refetchLabelsRef.current?.()} />
						<ProjectLabelsManager
							registerRefetch={(refetch) => {
								refetchLabelsRef.current = refetch;
							}}
						/>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
