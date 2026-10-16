import { useCallback, useEffect, useMemo, useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { getDisplayName } from '@/lib/display-name';
import { buildTeacherInfoPath } from '@/lib/teachers/teacherInfoTabsHelpers';
import { applyTeachersPageLoadOutcome, executeTeachersPageLoad } from '@/lib/teachers/teachersPageControllerHelpers';
import { deleteTeacher } from '@/lib/teachers/teachersPageHelpers';
import { buildTeachersColumns } from '@/lib/teachers/teachersTableColumns';
import type { TeacherWithLessonTypes } from '@/types/teachers';

interface UseTeachersPageControllerParams {
	authLoading: boolean;
	hasAccess: boolean;
	navigate: NavigateFunction;
	currentPage: number;
	rowsPerPage: number;
	debouncedSearchQuery: string;
	statusFilter: 'active' | 'inactive' | 'all' | null;
	selectedLessonTypeId: string | null;
	sortColumn: string | null;
	sortDirection: 'asc' | 'desc' | null;
	setLoading: (loading: boolean) => void;
	setTotalCount: (count: number) => void;
}

export function useTeachersPageController(params: UseTeachersPageControllerParams) {
	const {
		authLoading,
		hasAccess,
		navigate,
		currentPage,
		rowsPerPage,
		debouncedSearchQuery,
		statusFilter,
		selectedLessonTypeId,
		sortColumn,
		sortDirection,
		setLoading,
		setTotalCount,
	} = params;
	const [teachers, setTeachers] = useState<TeacherWithLessonTypes[]>([]);
	const [deleteDialog, setDeleteDialog] = useState<{
		open: boolean;
		teacher: TeacherWithLessonTypes | null;
	} | null>(null);
	const [teacherFormDialog, setTeacherFormDialog] = useState<{
		open: boolean;
		teacher: TeacherWithLessonTypes | null;
	}>({ open: false, teacher: null });

	const loadTeachers = useCallback(async () => {
		setLoading(true);
		const shouldStopLoading = applyTeachersPageLoadOutcome(
			await executeTeachersPageLoad({
				hasAccess,
				limit: rowsPerPage,
				offset: (currentPage - 1) * rowsPerPage,
				search: debouncedSearchQuery || null,
				status: statusFilter ?? 'all',
				lessonTypeId: selectedLessonTypeId,
				sortColumn,
				sortDirection,
			}),
			setTeachers,
			setTotalCount,
		);
		if (shouldStopLoading) {
			setLoading(false);
		}
	}, [
		hasAccess,
		rowsPerPage,
		currentPage,
		debouncedSearchQuery,
		statusFilter,
		selectedLessonTypeId,
		sortColumn,
		sortDirection,
		setLoading,
		setTotalCount,
	]);

	useEffect(() => {
		if (!authLoading) {
			void loadTeachers();
		}
	}, [authLoading, loadTeachers]);

	const columns = useMemo(() => buildTeachersColumns(), []);

	const handleEdit = useCallback(
		(teacher: TeacherWithLessonTypes) => {
			navigate(buildTeacherInfoPath(teacher.user_id));
		},
		[navigate],
	);

	const handleCreate = useCallback(() => {
		setTeacherFormDialog({ open: true, teacher: null });
	}, []);

	const handleDelete = useCallback((teacher: TeacherWithLessonTypes) => {
		setDeleteDialog({ open: true, teacher });
	}, []);

	const confirmDelete = useCallback(async () => {
		if (!deleteDialog?.teacher) return;

		try {
			await deleteTeacher(deleteDialog.teacher);
			setDeleteDialog(null);
			await loadTeachers();
		} catch {
			throw new Error('Delete failed');
		}
	}, [deleteDialog, loadTeachers]);

	return {
		teachers,
		columns,
		deleteDialog,
		setDeleteDialog,
		teacherFormDialog,
		setTeacherFormDialog,
		loadTeachers,
		handleEdit,
		handleCreate,
		handleDelete,
		confirmDelete,
		getDisplayName,
	};
}
