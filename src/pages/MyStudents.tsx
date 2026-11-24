import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { DataTable } from '@/components/ui/data-table';
import { NavPageShell } from '@/components/ui/nav-page-shell';
import { useAuth } from '@/hooks/useAuth';
import { useServerPaginatedListState } from '@/hooks/useServerPaginatedListState';
import { supabase } from '@/integrations/supabase/client';
import { buildMyStudentsLoadParams, mapMyStudentsPaginatedResponse } from '@/lib/students/myStudentsPageHelpers';
import { buildStudentDetailPath } from '@/lib/students/studentInfoTabsHelpers';
import { buildMyStudentColumns } from '@/lib/students/studentsTableColumns';
import type { StudentWithAgreements } from '@/types/students';

function applyMyStudentsLoadResult(
	result: { data: unknown; error: { message?: string } | null },
	handlers: {
		setStudents: (students: StudentWithAgreements[]) => void;
		setTotalCount: (count: number) => void;
		setLoading: (loading: boolean) => void;
	},
) {
	if (result.error) {
		console.error('Error loading students:', result.error);
		toast.error('Fout bij laden leerlingen');
		handlers.setLoading(false);
		return;
	}
	const mapped = mapMyStudentsPaginatedResponse(result.data);
	handlers.setStudents(mapped.students);
	handlers.setTotalCount(mapped.totalCount);
	handlers.setLoading(false);
}

function useMyStudentsList(teacherUserId: string | null, enabled: boolean) {
	const [students, setStudents] = useState<StudentWithAgreements[]>([]);
	const {
		loading,
		setLoading,
		totalCount,
		setTotalCount,
		searchQuery,
		debouncedSearchQuery,
		handleSearchChange,
		currentPage,
		rowsPerPage,
		handlePageChange,
		handleRowsPerPageChange,
	} = useServerPaginatedListState({
		storageKey: 'my-students',
		initialSortColumn: 'student',
		initialSortDirection: 'asc',
	});

	useEffect(() => {
		if (!enabled || !teacherUserId) return;

		let cancelled = false;
		setLoading(true);
		const loadParams = buildMyStudentsLoadParams(currentPage, rowsPerPage, debouncedSearchQuery);

		void supabase
			.rpc('get_students_paginated', {
				p_limit: loadParams.limit,
				p_offset: loadParams.offset,
				p_search: loadParams.search,
				p_status: 'all',
				p_lesson_type_id: null,
				p_sort_column: 'name',
				p_sort_direction: 'asc',
				p_include_agreements: true,
			})
			.then((result) => {
				if (cancelled) return;
				applyMyStudentsLoadResult(result, { setStudents, setTotalCount, setLoading });
			});

		return () => {
			cancelled = true;
		};
	}, [enabled, teacherUserId, currentPage, rowsPerPage, debouncedSearchQuery, setLoading, setTotalCount]);

	return {
		students,
		loading,
		totalCount,
		searchQuery,
		handleSearchChange,
		currentPage,
		rowsPerPage,
		handlePageChange,
		handleRowsPerPageChange,
	};
}

type MyStudentsView = 'loading' | 'redirect' | 'ready';

function resolveMyStudentsView(authLoading: boolean, isTeacher: boolean, listLoading: boolean): MyStudentsView {
	if (authLoading) return 'loading';
	if (!isTeacher) return 'redirect';
	if (listLoading) return 'loading';
	return 'ready';
}

function resolveMyStudentsLoadEnabled(authLoading: boolean, isTeacher: boolean): boolean {
	return !authLoading && isTeacher;
}

function useMyStudentsPageModel() {
	const navigate = useNavigate();
	const { isTeacher, teacherUserId, isLoading: authLoading } = useAuth();
	const list = useMyStudentsList(teacherUserId ?? null, resolveMyStudentsLoadEnabled(authLoading, isTeacher));
	const columns = useMemo(() => buildMyStudentColumns(), []);
	const view = resolveMyStudentsView(authLoading, isTeacher, list.loading);
	return { navigate, list, columns, view };
}

export default function MyStudents() {
	const { navigate, list, columns, view } = useMyStudentsPageModel();

	if (view === 'redirect') {
		return <Navigate to="/" replace />;
	}

	if (view === 'loading') {
		return <NavPageShell item="myStudents" loading />;
	}

	return (
		<NavPageShell item="myStudents">
			<DataTable
				data={list.students}
				columns={columns}
				searchQuery={list.searchQuery}
				onSearchChange={list.handleSearchChange}
				loading={list.loading}
				getRowKey={(student) => student.user_id}
				emptyMessage="Geen leerlingen gevonden"
				rowActions={{
					onEdit: (student) => navigate(buildStudentDetailPath(student.user_id)),
				}}
				serverPagination={{
					totalCount: list.totalCount,
					currentPage: list.currentPage,
					rowsPerPage: list.rowsPerPage,
					onPageChange: list.handlePageChange,
					onRowsPerPageChange: list.handleRowsPerPageChange,
				}}
			/>
		</NavPageShell>
	);
}
