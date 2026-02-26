import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuLoaderCircle, LuPlus, LuTriangleAlert } from 'react-icons/lu';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogMedia,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { LessonTypeBadge } from '@/components/ui/lesson-type-badge';
import { NAV_LABELS } from '@/config/nav-labels';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface LessonType {
	id: string;
	name: string;
	description: string | null;
	icon: string;
	color: string;
	cost_center: string | null;
	is_group_lesson: boolean;
	is_active: boolean;
	created_at: string;
	updated_at: string;
	options_count?: number;
}

export default function LessonTypes() {
	const navigate = useNavigate();
	const { isAdmin, isSiteAdmin, isLoading: authLoading } = useAuth();
	const [lessonTypes, setLessonTypes] = useState<LessonType[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [deleteDialog, setDeleteDialog] = useState<{
		open: boolean;
		lessonType: LessonType | null;
	} | null>(null);
	const [deletingLessonType, setDeletingLessonType] = useState(false);

	// Check access - only admin and site_admin can view this page
	const hasAccess = isAdmin || isSiteAdmin;

	const loadLessonTypes = useCallback(async () => {
		if (!hasAccess) return;

		setLoading(true);

		const { data, error } = await supabase.from('lesson_types').select('*').order('name', { ascending: true });

		if (error) {
			console.error('Error loading lesson types:', error);
			toast.error('Fout bij laden lessoorten');
			setLoading(false);
			return;
		}

		const types = data ?? [];
		if (types.length > 0) {
			const { data: counts } = await supabase
				.from('lesson_type_options')
				.select('lesson_type_id')
				.in(
					'lesson_type_id',
					types.map((t) => t.id),
				);
			const countMap = new Map<string, number>();
			for (const row of counts ?? []) {
				countMap.set(row.lesson_type_id, (countMap.get(row.lesson_type_id) ?? 0) + 1);
			}
			setLessonTypes(types.map((t) => ({ ...t, options_count: countMap.get(t.id) ?? 0 })));
		} else {
			setLessonTypes(types);
		}
		setLoading(false);
	}, [hasAccess]);

	useEffect(() => {
		if (!authLoading) {
			loadLessonTypes();
		}
	}, [authLoading, loadLessonTypes]);

	const columns: DataTableColumn<LessonType>[] = useMemo(
		() => [
			{
				key: 'name',
				label: 'Naam',
				sortable: true,
				sortValue: (lt) => lt.name.toLowerCase(),
				render: (lt) => (
					<div className="flex items-center gap-3">
						<LessonTypeBadge name={lt.name} icon={lt.icon} color={lt.color} showName={false} />
						<div>
							<p className="font-medium">{lt.name}</p>
							{lt.description && <p className="text-xs text-muted-foreground">{lt.description}</p>}
						</div>
					</div>
				),
			},
			{
				key: 'options_count',
				label: 'Lesopties',
				sortable: true,
				sortValue: (lt) => lt.options_count ?? 0,
				render: (lt) => <span className="text-muted-foreground">{lt.options_count ?? 0} opties</span>,
				className: 'text-muted-foreground',
			},
			{
				key: 'type',
				label: 'Type',
				sortable: true,
				sortValue: (lt) => (lt.is_group_lesson ? 1 : 0),
				render: (lt) => (
					<Badge variant={lt.is_group_lesson ? 'default' : 'secondary'}>
						{lt.is_group_lesson ? 'Groepsles' : 'Individueel'}
					</Badge>
				),
			},
			{
				key: 'status',
				label: 'Status',
				sortable: true,
				sortValue: (lt) => (lt.is_active ? 1 : 0),
				render: (lt) => (
					<Badge variant={lt.is_active ? 'default' : 'secondary'}>
						{lt.is_active ? 'Actief' : 'Inactief'}
					</Badge>
				),
			},
		],
		[],
	);

	const handleEdit = useCallback(
		(lessonType: LessonType) => {
			navigate(`/lesson-types/${lessonType.id}`);
		},
		[navigate],
	);

	const handleCreate = useCallback(() => {
		navigate('/lesson-types/new');
	}, [navigate]);

	const handleDelete = useCallback((lessonType: LessonType) => {
		setDeleteDialog({ open: true, lessonType });
	}, []);

	const confirmDelete = useCallback(async () => {
		if (!deleteDialog?.lessonType) return;

		setDeletingLessonType(true);

		try {
			const { error } = await supabase.from('lesson_types').delete().eq('id', deleteDialog.lessonType.id);

			if (error) {
				let translatedMessage = error.message;
				if (error.message.includes('Cannot delete lesson type')) {
					translatedMessage =
						'Kan lestype niet verwijderen: er zijn bestaande lesovereenkomsten die dit lestype gebruiken';
				}

				toast.error('Fout bij verwijderen lessoort', {
					description: translatedMessage,
				});
				return;
			}

			toast.success('Lessoort verwijderd', {
				description: `${deleteDialog.lessonType.name} is verwijderd.`,
			});

			// Remove from local state
			setLessonTypes((prev) => prev.filter((lt) => lt.id !== deleteDialog.lessonType?.id));
			setDeleteDialog(null);
		} catch (error) {
			console.error('Error deleting lesson type:', error);
			toast.error('Fout bij verwijderen lessoort', {
				description: 'Er is een netwerkfout opgetreden. Probeer het later opnieuw.',
			});
		} finally {
			setDeletingLessonType(false);
		}
	}, [deleteDialog]);

	// Redirect if no access
	if (!hasAccess) {
		return <Navigate to="/" replace />;
	}

	return (
		<div>
			<DataTable
				title={NAV_LABELS.lessonTypes}
				description={`Beheer alle ${NAV_LABELS.lessonTypes.toLowerCase()} en hun configuratie`}
				data={lessonTypes}
				columns={columns}
				searchQuery={searchQuery}
				onSearchChange={setSearchQuery}
				searchFields={[
					(lt) => lt.name,
					(lt) => lt.description ?? undefined,
					(lt) => lt.cost_center ?? undefined,
				]}
				loading={loading}
				getRowKey={(lt) => lt.id}
				emptyMessage="Geen lessoorten gevonden"
				initialSortColumn="name"
				initialSortDirection="asc"
				headerActions={
					<Button onClick={handleCreate}>
						<LuPlus className="mr-2 h-4 w-4" />
						Lessoort toevoegen
					</Button>
				}
				rowActions={{
					onEdit: handleEdit,
					onDelete: handleDelete,
				}}
			/>

			{/* Delete Lesson Type Dialog */}
			{deleteDialog && (
				<AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog(null)}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogMedia className="bg-destructive/10 text-destructive">
								<LuTriangleAlert className="h-6 w-6" />
							</AlertDialogMedia>
							<AlertDialogTitle>Lessoort verwijderen</AlertDialogTitle>
							<AlertDialogDescription asChild>
								<div>
									Weet je zeker dat je <strong>{deleteDialog.lessonType?.name}</strong> wilt
									verwijderen? Deze actie kan niet ongedaan worden gemaakt.
									<p className="mt-2 text-muted-foreground">
										Alle gegevens van deze lessoort worden permanent verwijderd.
									</p>
								</div>
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel asChild>
								<Button variant="outline" disabled={deletingLessonType}>
									Annuleren
								</Button>
							</AlertDialogCancel>
							<Button variant="destructive" onClick={confirmDelete} disabled={deletingLessonType}>
								{deletingLessonType ? (
									<>
										<LuLoaderCircle className="mr-2 h-4 w-4 animate-spin" />
										Verwijderen...
									</>
								) : (
									'Verwijderen'
								)}
							</Button>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			)}
		</div>
	);
}
