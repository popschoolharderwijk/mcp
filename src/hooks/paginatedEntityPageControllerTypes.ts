import type { NavigateFunction } from 'react-router-dom';

export interface PaginatedEntityPageControllerParams {
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
