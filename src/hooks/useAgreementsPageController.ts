import { useCallback, useEffect, useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { type AgreementAction, runAgreementPageAction } from '@/lib/agreements/agreementsPageActionHelpers';
import { applyAgreementsPageLoadOutcome, executeAgreementsPageLoad } from '@/lib/agreements/agreementsPageLoadHelpers';
import type { AgreementTableRow } from '@/types/lesson-agreements';

interface UseAgreementsPageControllerParams {
	authLoading: boolean;
	hasAccess: boolean;
	navigate: NavigateFunction;
	statusFilter: string | null;
	selectedLessonTypeId: string | null;
	debouncedSearchQuery: string;
	sortColumn: string | null;
	sortDirection: 'asc' | 'desc' | null;
	currentPage: number;
	rowsPerPage: number;
	setLoading: (loading: boolean) => void;
	setTotalCount: (count: number) => void;
	studentUserId?: string | null;
	teacherUserId?: string | null;
	onAgreementsMutated?: () => void;
}

export function useAgreementsPageController(params: UseAgreementsPageControllerParams) {
	const {
		authLoading,
		hasAccess,
		navigate,
		statusFilter,
		selectedLessonTypeId,
		debouncedSearchQuery,
		sortColumn,
		sortDirection,
		currentPage,
		rowsPerPage,
		setLoading,
		setTotalCount,
		studentUserId,
		teacherUserId,
		onAgreementsMutated,
	} = params;
	const [agreements, setAgreements] = useState<AgreementTableRow[]>([]);
	const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; agreement: AgreementTableRow | null } | null>(
		null,
	);

	const loadAgreements = useCallback(async () => {
		setLoading(true);
		const shouldStopLoading = applyAgreementsPageLoadOutcome(
			await executeAgreementsPageLoad({
				authLoading,
				hasAccess,
				statusFilter,
				selectedLessonTypeId,
				debouncedSearchQuery,
				sortColumn,
				sortDirection,
				currentPage,
				rowsPerPage,
				studentUserId,
				teacherUserId,
			}),
			setAgreements,
			setTotalCount,
		);
		if (shouldStopLoading) {
			setLoading(false);
		}
	}, [
		authLoading,
		hasAccess,
		statusFilter,
		selectedLessonTypeId,
		debouncedSearchQuery,
		sortColumn,
		sortDirection,
		currentPage,
		rowsPerPage,
		studentUserId,
		teacherUserId,
		setLoading,
		setTotalCount,
	]);

	useEffect(() => {
		void loadAgreements();
	}, [loadAgreements]);

	const runAction = (action: AgreementAction) =>
		runAgreementPageAction(action, deleteDialog, {
			navigate,
			setDeleteDialog,
			reloadAgreements: () => {
				void loadAgreements().then(() => {
					onAgreementsMutated?.();
				});
			},
		});

	return {
		agreements,
		deleteDialog,
		setDeleteDialog,
		loadAgreements,
		runAction,
	};
}
