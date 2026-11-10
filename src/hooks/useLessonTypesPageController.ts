import { useCallback, useEffect, useMemo, useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { runLessonTypeDelete } from '@/lib/lesson-types/lessonTypesPageControllerHelpers';
import { fetchLessonTypesWithOptionCounts, type LessonTypeListItem } from '@/lib/lesson-types/lessonTypesPageHelpers';
import { buildLessonTypesColumns } from '@/lib/lesson-types/lessonTypesTableColumns';

interface UseLessonTypesPageControllerParams {
	authLoading: boolean;
	hasAccess: boolean;
	navigate: NavigateFunction;
}

export function useLessonTypesPageController(params: UseLessonTypesPageControllerParams) {
	const [lessonTypes, setLessonTypes] = useState<LessonTypeListItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [deleteDialog, setDeleteDialog] = useState<{
		open: boolean;
		lessonType: LessonTypeListItem | null;
	} | null>(null);

	const loadLessonTypes = useCallback(async () => {
		if (!params.hasAccess) return;

		setLoading(true);
		const result = await fetchLessonTypesWithOptionCounts(supabase);
		if (result.error) {
			console.error('Error loading lesson types:', result.error);
			toast.error('Fout bij laden lessoorten');
			setLoading(false);
			return;
		}
		setLessonTypes(result.lessonTypes);
		setLoading(false);
	}, [params.hasAccess]);

	useEffect(() => {
		if (!params.authLoading) {
			void loadLessonTypes();
		}
	}, [params.authLoading, loadLessonTypes]);

	const columns = useMemo(() => buildLessonTypesColumns(), []);

	const handleEdit = useCallback(
		(lessonType: LessonTypeListItem) => {
			params.navigate(`/lesson-types/${lessonType.id}`);
		},
		[params.navigate],
	);

	const handleCreate = useCallback(() => {
		params.navigate('/lesson-types/new');
	}, [params.navigate]);

	const handleDelete = useCallback((lessonType: LessonTypeListItem) => {
		setDeleteDialog({ open: true, lessonType });
	}, []);

	const confirmDelete = useCallback(async () => {
		if (!deleteDialog?.lessonType) return;
		await runLessonTypeDelete({
			lessonType: deleteDialog.lessonType,
			supabase,
			setLessonTypes,
			setDeleteDialog,
		});
	}, [deleteDialog]);

	return {
		lessonTypes,
		loading,
		searchQuery,
		setSearchQuery,
		deleteDialog,
		setDeleteDialog,
		columns,
		handleEdit,
		handleCreate,
		handleDelete,
		confirmDelete,
	};
}
