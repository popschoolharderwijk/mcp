import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { mapAgreementSortColumn } from '@/lib/agreements/agreementsTableColumns';
import type { AgreementTableRow, LessonFrequency, PaginatedAgreementsResponseRaw } from '@/types/lesson-agreements';

export interface ExecuteAgreementsPageLoadParams {
	authLoading: boolean;
	hasAccess: boolean;
	statusFilter: string | null;
	selectedLessonTypeId: string | null;
	debouncedSearchQuery: string;
	sortColumn: string | null;
	sortDirection: 'asc' | 'desc' | null;
	currentPage: number;
	rowsPerPage: number;
	studentUserId?: string | null;
	teacherUserId?: string | null;
}

export type AgreementsPageLoadOutcome =
	| { kind: 'skipped' }
	| {
			kind: 'success';
			agreements: AgreementTableRow[];
			totalCount: number;
	  }
	| { kind: 'error' };

function resolveIsActiveFilter(statusFilter: string | null): boolean | undefined {
	if (statusFilter === 'active') return true;
	if (statusFilter === 'inactive') return false;
	return undefined;
}

function buildAgreementsPageLoadRpcParams(params: ExecuteAgreementsPageLoadParams) {
	return {
		p_limit: params.rowsPerPage,
		p_offset: (params.currentPage - 1) * params.rowsPerPage,
		p_search: params.debouncedSearchQuery ? params.debouncedSearchQuery : undefined,
		p_lesson_type_id: params.selectedLessonTypeId ?? undefined,
		p_is_active: resolveIsActiveFilter(params.statusFilter),
		p_sort_column: mapAgreementSortColumn(params.sortColumn),
		p_sort_direction: params.sortDirection || 'desc',
		p_student_user_id: params.studentUserId ?? undefined,
		p_teacher_user_id: params.teacherUserId ?? undefined,
	};
}

function mapPaginatedAgreementToTableRow(row: PaginatedAgreementsResponseRaw['data'][number]): AgreementTableRow {
	return {
		id: row.id,
		created_at: row.created_at,
		day_of_week: row.day_of_week,
		start_time: row.start_time,
		start_date: row.start_date,
		end_date: row.end_date,
		is_active: row.is_active,
		notes: row.notes,
		student_user_id: row.student_user_id,
		teacher_user_id: row.teacher_user_id,
		lesson_type_id: row.lesson_type_id,
		duration_minutes: row.duration_minutes,
		frequency: row.frequency as LessonFrequency,
		price_per_lesson: row.price_per_lesson,
		duo_pair_id: row.duo_pair_id,
		payment_method: 'stripe',
		sepa_mandate_id: null,
		student: {
			first_name: row.student.first_name,
			last_name: row.student.last_name,
			avatar_url: row.student.avatar_url,
			email: row.student.email ?? '',
		},
		teacher: {
			first_name: row.teacher.first_name,
			last_name: row.teacher.last_name,
			avatar_url: row.teacher.avatar_url,
			email: row.teacher.email ?? '',
		},
		lesson_type: {
			id: row.lesson_type.id,
			name: row.lesson_type.name,
			icon: row.lesson_type.icon,
			color: row.lesson_type.color,
		},
	};
}

export async function executeAgreementsPageLoad(
	params: ExecuteAgreementsPageLoadParams,
): Promise<AgreementsPageLoadOutcome> {
	if (params.authLoading || !params.hasAccess) {
		return { kind: 'skipped' };
	}

	try {
		const { data, error } = await supabase.rpc(
			'get_lesson_agreements_paginated',
			buildAgreementsPageLoadRpcParams(params),
		);

		if (error) {
			console.error('Error loading agreements:', error);
			toast.error('Fout bij laden overeenkomsten');
			return { kind: 'error' };
		}

		const result = data as unknown as PaginatedAgreementsResponseRaw;

		return {
			kind: 'success',
			agreements: (result.data ?? []).map(mapPaginatedAgreementToTableRow),
			totalCount: result.total_count ?? 0,
		};
	} catch (loadError) {
		console.error('Error loading agreements:', loadError);
		toast.error('Fout bij laden overeenkomsten');
		return { kind: 'error' };
	}
}

export function applyAgreementsPageLoadOutcome(
	outcome: AgreementsPageLoadOutcome,
	setAgreements: (agreements: AgreementTableRow[]) => void,
	setTotalCount: (count: number) => void,
): boolean {
	if (outcome.kind === 'success') {
		setAgreements(outcome.agreements);
		setTotalCount(outcome.totalCount);
	}
	return outcome.kind !== 'skipped';
}
