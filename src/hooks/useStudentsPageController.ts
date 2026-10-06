import { useCallback, useEffect, useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type { SignupRequestDetail } from '@/components/students/SignupRequestDialog';
import {
	applyStudentsPageLoadOutcome,
	executeStudentsPageLoad,
	runStudentPageAction,
	type StudentAction,
} from '@/lib/students/studentsPageControllerHelpers';
import { buildStudentColumns } from '@/lib/students/studentsTableColumns';
import type { StudentWithAgreements } from '@/types/students';

interface UseStudentsPageControllerParams {
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

export function useStudentsPageController(params: UseStudentsPageControllerParams) {
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
	const [students, setStudents] = useState<StudentWithAgreements[]>([]);
	const [requestsByEmail, setRequestsByEmail] = useState<Map<string, SignupRequestDetail[]>>(new Map());
	const [deleteDialog, setDeleteDialog] = useState<{
		open: boolean;
		student: StudentWithAgreements;
		deleteUser: boolean;
	} | null>(null);

	const loadStudents = useCallback(async () => {
		setLoading(true);
		const shouldStopLoading = applyStudentsPageLoadOutcome(
			await executeStudentsPageLoad({
				authLoading,
				hasAccess,
				limit: rowsPerPage,
				offset: (currentPage - 1) * rowsPerPage,
				search: debouncedSearchQuery,
				statusFilter,
				lessonTypeId: selectedLessonTypeId,
				sortColumn,
				sortDirection,
			}),
			setStudents,
			setTotalCount,
			setRequestsByEmail,
		);
		if (shouldStopLoading) {
			setLoading(false);
		}
	}, [
		authLoading,
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
		void loadStudents();
	}, [loadStudents]);

	const runAction = (action: StudentAction) =>
		runStudentPageAction(action, deleteDialog, {
			setDeleteDialog,
			loadStudents,
		});

	const handleEdit = useCallback(
		(student: StudentWithAgreements) => {
			navigate(`/students/${student.user_id}`);
		},
		[navigate],
	);

	const columns = buildStudentColumns(navigate, requestsByEmail);

	return {
		students,
		columns,
		deleteDialog,
		setDeleteDialog,
		handleEdit,
		loadStudents,
		runAction,
	};
}
