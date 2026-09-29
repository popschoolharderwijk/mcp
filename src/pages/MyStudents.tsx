import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MyStudentsAgreementsCell, MyStudentsLessonTypesCell } from '@/components/students/MyStudentsTableParts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { PageShell } from '@/components/ui/page-shell';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { NAV_LABELS } from '@/config/nav-labels';
import { useAuth } from '@/hooks/useAuth';
import { useServerPaginatedListState } from '@/hooks/useServerPaginatedListState';
import { supabase } from '@/integrations/supabase/client';
import {
	applyMyStudentsLoadOutcome,
	buildMyStudentsLoadParams,
	mapMyStudentsPaginatedResponse,
	myStudentDisplayName,
	myStudentInitials,
	shouldRedirectMyStudents,
	shouldShowMyStudentsSkeleton,
	shouldSkipMyStudentsLoad,
} from '@/lib/students/myStudentsPageHelpers';
import type { StudentWithAgreements } from '@/types/students';

export default function MyStudents() {
	const { isTeacher, teacherUserId, isLoading: authLoading } = useAuth();
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
		if (shouldSkipMyStudentsLoad(authLoading, isTeacher, teacherUserId)) return;

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
			})
			.then(({ data, error }) => {
				if (cancelled) return;
				if (error) {
					console.error('Error loading students:', error);
					toast.error('Fout bij laden leerlingen');
					setLoading(false);
					return;
				}
				applyMyStudentsLoadOutcome(mapMyStudentsPaginatedResponse(data), setStudents, setTotalCount);
				setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [
		authLoading,
		isTeacher,
		teacherUserId,
		currentPage,
		rowsPerPage,
		debouncedSearchQuery,
		setLoading,
		setTotalCount,
	]);

	const columns: DataTableColumn<StudentWithAgreements>[] = useMemo(
		() => [
			{
				key: 'student',
				label: 'Leerling',
				sortable: false,
				className: 'w-56',
				render: (student) => (
					<div className="flex items-center gap-3">
						<Avatar className="h-9 w-9 flex-shrink-0">
							<AvatarImage src={student.avatar_url ?? undefined} alt={myStudentDisplayName(student)} />
							<AvatarFallback className="bg-primary/10 text-primary text-sm">
								{myStudentInitials(student)}
							</AvatarFallback>
						</Avatar>
						<TooltipProvider delayDuration={200}>
							<Tooltip>
								<TooltipTrigger asChild>
									<div className="min-w-0 flex-1 overflow-hidden">
										<Link
											to={`/students/${student.user_id}`}
											className="block font-medium truncate hover:text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm"
										>
											{myStudentDisplayName(student)}
										</Link>
										<p className="text-xs text-muted-foreground truncate">{student.email}</p>
									</div>
								</TooltipTrigger>
								<TooltipContent side="top" align="start">
									<p className="font-medium">{myStudentDisplayName(student)}</p>
									<p className="text-xs text-muted-foreground">{student.email}</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
				),
			},
			{
				key: 'phone_number',
				label: 'Telefoon',
				sortable: false,
				render: (student) => <span className="text-muted-foreground">{student.phone_number || '-'}</span>,
				className: 'text-muted-foreground',
			},
			{
				key: 'lesson_types',
				label: 'Lessoorten',
				sortable: false,
				render: (student) => <MyStudentsLessonTypesCell student={student} />,
			},
			{
				key: 'agreements',
				label: 'Lesovereenkomsten',
				sortable: false,
				className: 'min-w-96',
				render: (student) => <MyStudentsAgreementsCell student={student} />,
			},
		],
		[],
	);

	if (shouldRedirectMyStudents(authLoading, isTeacher)) {
		return <Navigate to="/" replace />;
	}

	if (shouldShowMyStudentsSkeleton(authLoading, loading)) {
		return (
			<PageShell
				title={NAV_LABELS.myStudents}
				description="Overzicht van alle leerlingen met lesovereenkomsten bij jou. Klik op een leerling om de leshistorie te bekijken."
				loading
			/>
		);
	}

	return (
		<PageShell
			title={NAV_LABELS.myStudents}
			description="Overzicht van alle leerlingen met lesovereenkomsten bij jou. Klik op een leerling om de leshistorie te bekijken."
		>
			<DataTable
				data={students}
				columns={columns}
				searchQuery={searchQuery}
				onSearchChange={handleSearchChange}
				loading={loading}
				getRowKey={(student) => student.user_id}
				emptyMessage="Geen leerlingen gevonden"
				serverPagination={{
					totalCount,
					currentPage,
					rowsPerPage,
					onPageChange: handlePageChange,
					onRowsPerPageChange: handleRowsPerPageChange,
				}}
			/>
		</PageShell>
	);
}
