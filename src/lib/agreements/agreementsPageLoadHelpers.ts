import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { filterAgreementRows, sortAgreementRows } from '@/lib/agreements/agreementListHelpers';
import { mapRawAgreementToTableRow, type RawAgreementRow } from '@/lib/agreements/mapAgreementTableRow';
import type { AgreementTableRow } from '@/types/lesson-agreements';

const AGREEMENTS_LIST_SELECT =
	'id, created_at, day_of_week, start_time, start_date, end_date, is_active, notes, student_user_id, teacher_user_id, lesson_type_id, duration_minutes, frequency, duo_pair_id, lesson_types(id, name, icon, color), teachers(user_id)';

const EMPTY_AGREEMENT_PROFILE = {
	first_name: null,
	last_name: null,
	avatar_url: null,
	email: '',
} as const;

function agreementsListQuery() {
	return supabase.from('lesson_agreements').select(AGREEMENTS_LIST_SELECT, { count: 'exact' });
}

type AgreementsListQuery = ReturnType<typeof agreementsListQuery>;

function applyAgreementFilters(
	query: AgreementsListQuery,
	statusFilter: string | null,
	selectedLessonTypeId: string | null,
) {
	let nextQuery = query;
	if (statusFilter === 'active') nextQuery = nextQuery.eq('is_active', true);
	if (statusFilter === 'inactive') nextQuery = nextQuery.eq('is_active', false);
	if (selectedLessonTypeId) nextQuery = nextQuery.eq('lesson_type_id', selectedLessonTypeId);
	return nextQuery;
}

function resolveAgreementSortUsesClientSideProfile(sortColumn: string | null): boolean {
	return sortColumn === 'student' || sortColumn === 'teacher';
}

function applyAgreementSort(
	query: AgreementsListQuery,
	sortColumn: string | null,
	sortDirection: 'asc' | 'desc' | null,
) {
	if (resolveAgreementSortUsesClientSideProfile(sortColumn)) {
		return query.order('start_date', { ascending: false });
	}

	const ascending = sortDirection === 'asc';
	const sortHandlers: Record<string, (q: AgreementsListQuery) => AgreementsListQuery> = {
		created_at: (q) => q.order('created_at', { ascending }),
		dayAndTime: (q) => q.order('day_of_week', { ascending: true }).order('start_time', { ascending: true }),
		end_date: (q) => q.order('end_date', { ascending: true, nullsFirst: false }),
		duration_minutes: (q) => q.order('duration_minutes', { ascending: true }),
		status: (q) => q.order('is_active', { ascending: true }),
	};

	const handler = sortColumn ? sortHandlers[sortColumn] : undefined;
	if (handler) return handler(query);
	return query.order('start_date', { ascending: false });
}

function collectAgreementProfileUserIds(raw: RawAgreementRow[]): string[] {
	const studentUserIds = [...new Set(raw.map((agreement) => agreement.student_user_id))];
	const teacherUserIds = [
		...new Set(
			raw
				.map((agreement) => {
					const teachers = agreement.teachers;
					const teacherRef = Array.isArray(teachers) ? teachers[0] : teachers;
					return teacherRef?.user_id;
				})
				.filter(Boolean) as string[],
		),
	];
	return [...new Set([...studentUserIds, ...teacherUserIds])];
}

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
}

export type AgreementsPageLoadOutcome =
	| { kind: 'skipped' }
	| {
			kind: 'success';
			agreements: AgreementTableRow[];
			totalCount: number;
	  }
	| { kind: 'error' };

function paginateAgreementRows(
	rows: AgreementTableRow[],
	currentPage: number,
	rowsPerPage: number,
): AgreementTableRow[] {
	const startIndex = (currentPage - 1) * rowsPerPage;
	return rows.slice(startIndex, startIndex + rowsPerPage);
}

export async function executeAgreementsPageLoad(
	params: ExecuteAgreementsPageLoadParams,
): Promise<AgreementsPageLoadOutcome> {
	if (params.authLoading || !params.hasAccess) {
		return { kind: 'skipped' };
	}

	try {
		let query = agreementsListQuery();
		query = applyAgreementFilters(query, params.statusFilter, params.selectedLessonTypeId);
		query = applyAgreementSort(query, params.sortColumn, params.sortDirection);

		const { data: agreementsData, error: agreementsError, count } = await query;

		if (agreementsError) {
			console.error('Error loading agreements:', agreementsError);
			toast.error('Fout bij laden overeenkomsten');
			return { kind: 'error' };
		}

		const raw = (agreementsData ?? []) as unknown as RawAgreementRow[];
		const profileUserIds = collectAgreementProfileUserIds(raw);

		if (profileUserIds.length === 0) {
			return {
				kind: 'success',
				agreements: [],
				totalCount: 0,
			};
		}

		// Chunk the id list: one `.in()` with ~1000 UUIDs exceeds the URL length limit (400 Bad Request).
		const PROFILE_CHUNK_SIZE = 150;
		const chunks: string[][] = [];
		for (let i = 0; i < profileUserIds.length; i += PROFILE_CHUNK_SIZE) {
			chunks.push(profileUserIds.slice(i, i + PROFILE_CHUNK_SIZE));
		}
		const results = await Promise.all(
			chunks.map((ids) =>
				supabase.from('profiles').select('user_id, first_name, last_name, avatar_url, email').in('user_id', ids),
			),
		);
		const profilesError = results.find((r) => r.error)?.error;
		if (profilesError) {
			console.error('Error loading profiles:', profilesError);
			toast.error('Fout bij laden profielen');
			return { kind: 'error' };
		}
		const profilesData = results.flatMap((r) => r.data ?? []);

		const profileMap = new Map(
			(profilesData ?? []).map((profile) => [
				profile.user_id,
				{
					first_name: profile.first_name,
					last_name: profile.last_name,
					avatar_url: profile.avatar_url ?? null,
					email: profile.email ?? '',
				},
			]),
		);

		let rows = raw.map((agreement) =>
			mapRawAgreementToTableRow(agreement, profileMap, EMPTY_AGREEMENT_PROFILE, EMPTY_AGREEMENT_PROFILE),
		);
		rows = filterAgreementRows(rows, params.debouncedSearchQuery);
		rows = sortAgreementRows(rows, params.sortColumn, params.sortDirection);

		return {
			kind: 'success',
			agreements: paginateAgreementRows(rows, params.currentPage, params.rowsPerPage),
			totalCount: params.debouncedSearchQuery ? rows.length : (count ?? rows.length),
		};
	} catch (error) {
		console.error('Error loading agreements:', error);
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
