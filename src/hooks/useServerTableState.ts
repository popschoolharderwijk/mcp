import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SortDirection } from '@/components/ui/data-table';

const STORAGE_PREFIX = 'table-state:';

interface StoredTableState {
	sortColumn: string | null;
	sortDirection: SortDirection;
	currentPage: number;
	rowsPerPage: number;
	searchQuery: string;
	/** Active filters (e.g. statusFilter, selectedLessonTypeId) – table-specific keys */
	filters?: Record<string, unknown>;
}

function readStoredState(storageKey: string): Partial<StoredTableState> | null {
	try {
		const raw = sessionStorage.getItem(STORAGE_PREFIX + storageKey);
		if (!raw) return null;
		return JSON.parse(raw) as Partial<StoredTableState>;
	} catch {
		return null;
	}
}

function writeStoredState(storageKey: string, state: StoredTableState): void {
	try {
		sessionStorage.setItem(STORAGE_PREFIX + storageKey, JSON.stringify(state));
	} catch {
		// ignore quota / private mode
	}
}

interface UseServerTableStateOptions<K extends string = string> {
	initialSortColumn?: K;
	initialSortDirection?: SortDirection;
	searchDebounceMs?: number;
	initialRowsPerPage?: number;
	/** Unique key for this table; when set, sort/pagination/search/filters are persisted in sessionStorage */
	storageKey?: string;
	/** Default filter values when nothing is stored; also defines which filter keys exist (e.g. statusFilter, selectedLessonTypeId) */
	initialFilters?: Record<string, unknown>;
}

interface UseServerTableStateReturn<K extends string = string> {
	// Search state
	searchQuery: string;
	debouncedSearchQuery: string;
	handleSearchChange: (query: string) => void;

	// Pagination state
	currentPage: number;
	rowsPerPage: number;
	handlePageChange: (page: number) => void;
	handleRowsPerPageChange: (newRowsPerPage: number) => void;

	// Sorting state
	sortColumn: K | null;
	sortDirection: SortDirection;
	handleSortChange: (column: K | null, direction: SortDirection) => void;

	// Filter state (persisted when storageKey is set)
	filters: Record<string, unknown>;
	setFilters: Dispatch<SetStateAction<Record<string, unknown>>>;
}

/**
 * Custom hook for managing server-side table state (pagination, sorting, search).
 * Handles debouncing, state synchronization, and automatic page reset on filter/sort changes.
 * Pass the sort column key union as K so sortColumn and handleSortChange are type-safe.
 */
export function useServerTableState<K extends string = string>(
	options: UseServerTableStateOptions<K> = {},
): UseServerTableStateReturn<K> {
	const {
		initialSortColumn,
		initialSortDirection = 'asc',
		searchDebounceMs = 300,
		initialRowsPerPage = 20,
		storageKey,
		initialFilters = {},
	} = options;

	// Restore from sessionStorage once on mount (lazy init)
	const [searchQuery, setSearchQuery] = useState(() => {
		const s = storageKey ? readStoredState(storageKey) : null;
		return s?.searchQuery ?? '';
	});
	const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(() => {
		const s = storageKey ? readStoredState(storageKey) : null;
		return s?.searchQuery ?? '';
	});
	const [currentPage, setCurrentPage] = useState(() => {
		const s = storageKey ? readStoredState(storageKey) : null;
		return s?.currentPage ?? 1;
	});
	const [rowsPerPage, setRowsPerPage] = useState(() => {
		const s = storageKey ? readStoredState(storageKey) : null;
		return s?.rowsPerPage ?? initialRowsPerPage;
	});
	const [sortColumn, setSortColumn] = useState<K | null>(() => {
		const s = storageKey ? readStoredState(storageKey) : null;
		return (s?.sortColumn ?? initialSortColumn ?? null) as K | null;
	});
	const [sortDirection, setSortDirection] = useState<SortDirection>(() => {
		const s = storageKey ? readStoredState(storageKey) : null;
		return s?.sortDirection ?? (initialSortColumn ? initialSortDirection : null);
	});
	const [filters, setFilters] = useState<Record<string, unknown>>(() => {
		const s = storageKey ? readStoredState(storageKey) : null;
		const stored = s?.filters;
		if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
			return { ...initialFilters, ...stored };
		}
		return { ...initialFilters };
	});

	// Debounce search query
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearchQuery(searchQuery);
		}, searchDebounceMs);
		return () => clearTimeout(timer);
	}, [searchQuery, searchDebounceMs]);

	// Handle search query change
	const handleSearchChange = useCallback((query: string) => {
		setSearchQuery(query);
	}, []);

	// Handle page change
	const handlePageChange = useCallback((page: number) => {
		setCurrentPage(page);
	}, []);

	// Handle rows per page change
	const handleRowsPerPageChange = useCallback((newRowsPerPage: number) => {
		setRowsPerPage(newRowsPerPage);
		setCurrentPage(1);
	}, []);

	// Handle sort change
	const handleSortChange = useCallback((column: K | null, direction: SortDirection) => {
		setSortColumn(column);
		setSortDirection(direction);
	}, []);

	// Reset to page 1 when filters/sorting change
	const prevStateRef = useRef({
		debouncedSearchQuery,
		sortColumn,
		sortDirection,
		filtersString: JSON.stringify(filters),
	});

	useEffect(() => {
		const prev = prevStateRef.current;
		const currentFiltersString = JSON.stringify(filters);
		const hasChanged =
			prev.debouncedSearchQuery !== debouncedSearchQuery ||
			prev.sortColumn !== sortColumn ||
			prev.sortDirection !== sortDirection ||
			prev.filtersString !== currentFiltersString;

		if (hasChanged) {
			setCurrentPage(1);
			prevStateRef.current = {
				debouncedSearchQuery,
				sortColumn,
				sortDirection,
				filtersString: currentFiltersString,
			};
		}
	}, [debouncedSearchQuery, sortColumn, sortDirection, filters]);

	// Persist to sessionStorage when storageKey is set (sortColumn is string at runtime)
	useEffect(() => {
		if (!storageKey) return;
		writeStoredState(storageKey, {
			sortColumn: sortColumn as string | null,
			sortDirection,
			currentPage,
			rowsPerPage,
			searchQuery,
			filters,
		});
	}, [storageKey, sortColumn, sortDirection, currentPage, rowsPerPage, searchQuery, filters]);

	return {
		// Search
		searchQuery,
		debouncedSearchQuery,
		handleSearchChange,

		// Pagination
		currentPage,
		rowsPerPage,
		handlePageChange,
		handleRowsPerPageChange,

		// Sorting
		sortColumn,
		sortDirection,
		handleSortChange,

		// Filters (persisted when storageKey is set)
		filters,
		setFilters,
	};
}
