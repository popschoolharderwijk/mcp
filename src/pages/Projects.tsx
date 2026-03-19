import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LuPlus, LuSettings } from 'react-icons/lu';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ProjectAgendaEvents } from '@/components/projects/ProjectAgendaEvents';
import { ProjectDomainsManager } from '@/components/projects/ProjectDomainsManager';
import { ProjectFormDialog } from '@/components/projects/ProjectFormDialog';
import { ProjectLabelsManager } from '@/components/projects/ProjectLabelsManager';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserDisplay } from '@/components/ui/user-display';
import { NAV_LABELS } from '@/config/nav-labels';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { ProjectRow } from '@/types/projects';

export default function Projects() {
	const { isAdmin, isSiteAdmin, isPrivileged, isTeacher, isLoading: authLoading } = useAuth();
	const [projects, setProjects] = useState<ProjectRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [formDialog, setFormDialog] = useState<{ open: boolean; project: ProjectRow | null }>({
		open: false,
		project: null,
	});
	const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; project: ProjectRow | null } | null>(null);
	const [settingsModalOpen, setSettingsModalOpen] = useState(false);
	const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
	const refetchLabelsRef = useRef<() => void>();

	const canView = isTeacher || isPrivileged;
	const canEdit = isAdmin || isSiteAdmin;
	const canSchedule = isPrivileged;

	const loadProjects = useCallback(async () => {
		if (!canView) return;
		setLoading(true);

		const { data: projectsData, error: projectsError } = await supabase
			.from('projects')
			.select('*')
			.order('name', { ascending: true });

		if (projectsError) {
			console.error('Error loading projects:', projectsError);
			toast.error('Fout bij laden projecten');
			setLoading(false);
			return;
		}

		const rawProjects = projectsData ?? [];
		if (rawProjects.length === 0) {
			setProjects([]);
			setLoading(false);
			return;
		}

		// Count scheduled time slots (agenda_events) per project
		const projectIds = rawProjects.map((p) => p.id);
		const { data: projectEvents } = await supabase
			.from('agenda_events')
			.select('source_id')
			.eq('source_type', 'project')
			.in('source_id', projectIds);
		const slotCountByProject = new Map<string, number>();
		for (const id of projectIds) slotCountByProject.set(id, 0);
		for (const row of projectEvents ?? []) {
			if (row.source_id) slotCountByProject.set(row.source_id, (slotCountByProject.get(row.source_id) ?? 0) + 1);
		}

		// Fetch labels + domains
		const labelIds = [...new Set(rawProjects.map((p) => p.label_id))];
		const { data: labels } = await supabase.from('project_labels').select('id, name, domain_id').in('id', labelIds);

		const domainIds = [...new Set((labels ?? []).map((l) => l.domain_id))];
		const { data: domains } = await supabase.from('project_domains').select('id, name').in('id', domainIds);

		// Fetch owner profiles
		const ownerIds = [...new Set(rawProjects.map((p) => p.owner_user_id))];
		const { data: profiles } = await supabase
			.from('view_profiles_with_display_name')
			.select('user_id, first_name, last_name, email, avatar_url')
			.in('user_id', ownerIds);

		const labelMap = new Map((labels ?? []).map((l) => [l.id, l]));
		const domainMap = new Map((domains ?? []).map((d) => [d.id, d]));
		const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

		const rows: ProjectRow[] = rawProjects.map((p) => {
			const label = labelMap.get(p.label_id);
			const domain = label ? domainMap.get(label.domain_id) : undefined;
			const owner = profileMap.get(p.owner_user_id);
			return {
				id: p.id,
				name: p.name,
				description: p.description,
				cost_center: p.cost_center,
				is_active: p.is_active,
				owner_user_id: p.owner_user_id,
				label_id: p.label_id,
				created_at: p.created_at,
				updated_at: p.updated_at,
				created_by: p.created_by,
				updated_by: p.updated_by,
				label_name: label?.name ?? '—',
				domain_name: domain?.name ?? '—',
				owner_first_name: owner?.first_name ?? null,
				owner_last_name: owner?.last_name ?? null,
				owner_email: owner?.email ?? null,
				owner_avatar_url: owner?.avatar_url ?? null,
				slot_count: slotCountByProject.get(p.id) ?? 0,
			};
		});

		setProjects(rows);
		setLoading(false);
	}, [canView]);

	useEffect(() => {
		if (!authLoading) {
			loadProjects();
		}
	}, [authLoading, loadProjects]);

	const columns: DataTableColumn<ProjectRow>[] = useMemo(
		() => [
			{
				key: 'name',
				label: 'Naam',
				sortable: true,
				sortValue: (p) => p.name.toLowerCase(),
				render: (p) => (
					<div>
						<p className="font-medium">{p.name}</p>
						{p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
					</div>
				),
			},
			{
				key: 'domain',
				label: 'Domein',
				sortable: true,
				sortValue: (p) => p.domain_name.toLowerCase(),
				render: (p) => <span className="text-muted-foreground">{p.domain_name}</span>,
			},
			{
				key: 'label',
				label: 'Label',
				sortable: true,
				sortValue: (p) => p.label_name.toLowerCase(),
				render: (p) => <span className="text-muted-foreground">{p.label_name}</span>,
			},
			{
				key: 'slot_count',
				label: 'Aantal',
				sortable: true,
				sortValue: (p) => p.slot_count,
				render: (p) => <span className="text-muted-foreground">{p.slot_count}</span>,
			},
			{
				key: 'owner',
				label: 'Eigenaar',
				sortable: true,
				sortValue: (p) => (p.owner_first_name ?? p.owner_email ?? '').toLowerCase(),
				render: (p) => (
					<UserDisplay
						profile={{
							first_name: p.owner_first_name,
							last_name: p.owner_last_name,
							email: p.owner_email,
							avatar_url: p.owner_avatar_url,
						}}
					/>
				),
			},
			{
				key: 'cost_center',
				label: 'Kostenplaats',
				sortable: true,
				sortValue: (p) => p.cost_center ?? '',
				render: (p) => <span className="text-muted-foreground">{p.cost_center ?? '—'}</span>,
			},
			{
				key: 'status',
				label: 'Status',
				sortable: true,
				sortValue: (p) => (p.is_active ? 1 : 0),
				render: (p) => (
					<Badge variant={p.is_active ? 'default' : 'secondary'}>{p.is_active ? 'Actief' : 'Inactief'}</Badge>
				),
			},
		],
		[],
	);

	const handleCreate = useCallback(() => {
		setFormDialog({ open: true, project: null });
	}, []);

	const handleEdit = useCallback((project: ProjectRow) => {
		setFormDialog({ open: true, project });
	}, []);

	const handleDelete = useCallback((project: ProjectRow) => {
		setDeleteDialog({ open: true, project });
	}, []);

	const confirmDelete = useCallback(async () => {
		if (!deleteDialog?.project) return;
		const { data, error } = await supabase.from('projects').delete().eq('id', deleteDialog.project.id).select('id');
		if (error) {
			toast.error('Fout bij verwijderen project', { description: error.message });
			throw new Error(error.message);
		}
		if (!data?.length) {
			toast.error('Project niet verwijderd', {
				description:
					'Geen rechten om dit project te verwijderen. Alleen beheerders kunnen projecten verwijderen.',
			});
			setDeleteDialog(null);
			return;
		}
		toast.success('Project verwijderd', { description: `${deleteDialog.project.name} is verwijderd.` });
		setProjects((prev) => prev.filter((p) => p.id !== deleteDialog.project?.id));
		setDeleteDialog(null);
	}, [deleteDialog]);

	const renderExpandedRow = useCallback(
		(project: ProjectRow) => (
			<ProjectAgendaEvents projectId={project.id} canSchedule={canSchedule && project.is_active} />
		),
		[canSchedule],
	);

	if (!canView) {
		return <Navigate to="/" replace />;
	}

	return (
		<div>
			<DataTable
				title={NAV_LABELS.projects}
				description={`Beheer alle ${NAV_LABELS.projects.toLowerCase()}`}
				data={projects}
				columns={columns}
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
				renderExpandedRow={renderExpandedRow}
				headerActions={
					<div className="flex items-center gap-2">
						{canEdit && (
							<>
								<Button onClick={handleCreate}>
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
							</>
						)}
					</div>
				}
				rowActions={{
					onEdit: canEdit ? handleEdit : undefined,
					onDelete: canEdit ? handleDelete : undefined,
				}}
			/>

			<ProjectFormDialog
				open={formDialog.open}
				onOpenChange={(open) => !open && setFormDialog({ open: false, project: null })}
				project={formDialog.project}
				onSaved={loadProjects}
			/>

			{deleteDialog && (
				<ConfirmDeleteDialog
					open={deleteDialog.open}
					onOpenChange={(open) => !open && setDeleteDialog(null)}
					title="Project verwijderen"
					description={
						<>
							Weet je zeker dat je <strong>{deleteDialog.project?.name}</strong> wilt verwijderen? Deze
							actie kan niet ongedaan worden gemaakt.
						</>
					}
					onConfirm={confirmDelete}
				/>
			)}

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
