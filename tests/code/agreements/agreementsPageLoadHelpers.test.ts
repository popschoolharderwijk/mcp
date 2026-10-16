import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

let rpcResult: { data: unknown; error: { message: string } | null } = {
	data: null,
	error: null,
};

mock.module('sonner', () => ({
	toast: {
		error: () => {},
	},
}));

mock.module('../../../src/integrations/supabase/client', () => ({
	supabase: {
		rpc: () => Promise.resolve(rpcResult),
	},
}));

const paginatedAgreement = {
	id: 'agreement-1',
	created_at: '2026-01-01T00:00:00Z',
	updated_at: '2026-01-01T00:00:00Z',
	day_of_week: 1,
	start_time: '14:00:00',
	start_date: '2026-01-01',
	end_date: null,
	is_active: true,
	notes: null,
	student_user_id: 'student-1',
	teacher_user_id: 'teacher-1',
	lesson_type_id: 'lesson-1',
	duration_minutes: 60,
	frequency: 'weekly',
	price_per_lesson: 2500,
	duo_pair_id: null,
	student: {
		user_id: 'student-1',
		first_name: 'Anna',
		last_name: 'Leerling',
		avatar_url: null,
		email: 'anna@example.com',
		display_name: 'Anna Leerling',
	},
	teacher: {
		user_id: 'teacher-1',
		first_name: 'Piet',
		last_name: 'Docent',
		avatar_url: null,
		email: 'piet@example.com',
		display_name: 'Piet Docent',
	},
	lesson_type: { id: 'lesson-1', name: 'Piano', icon: 'piano', color: '#000000' },
};

describe('agreementsPageLoadHelpers', () => {
	let applyAgreementsPageLoadOutcome: typeof import('../../../src/lib/agreements/agreementsPageLoadHelpers').applyAgreementsPageLoadOutcome;
	let executeAgreementsPageLoad: typeof import('../../../src/lib/agreements/agreementsPageLoadHelpers').executeAgreementsPageLoad;
	type AgreementsPageLoadOutcome =
		import('../../../src/lib/agreements/agreementsPageLoadHelpers').AgreementsPageLoadOutcome;

	beforeAll(async () => {
		({ applyAgreementsPageLoadOutcome, executeAgreementsPageLoad } = await import(
			'../../../src/lib/agreements/agreementsPageLoadHelpers'
		));
	});

	beforeEach(() => {
		rpcResult = {
			data: {
				data: [paginatedAgreement],
				total_count: 1,
				limit: 10,
				offset: 0,
			},
			error: null,
		};
	});

	describe('applyAgreementsPageLoadOutcome', () => {
		it('applies success outcome and returns true', () => {
			let agreementCount = -1;
			let totalCount = -1;
			const outcome: AgreementsPageLoadOutcome = {
				kind: 'success',
				agreements: [],
				totalCount: 4,
			};
			const shouldStopLoading = applyAgreementsPageLoadOutcome(
				outcome,
				(value) => {
					agreementCount = value.length;
				},
				(value) => {
					totalCount = value;
				},
			);
			expect(shouldStopLoading).toBe(true);
			expect(agreementCount).toBe(0);
			expect(totalCount).toBe(4);
		});

		it('returns false for skipped outcome', () => {
			expect(
				applyAgreementsPageLoadOutcome(
					{ kind: 'skipped' },
					() => {},
					() => {},
				),
			).toBe(false);
		});
	});

	describe('executeAgreementsPageLoad', () => {
		it('returns skipped when auth is still loading', async () => {
			expect(
				await executeAgreementsPageLoad({
					authLoading: true,
					hasAccess: true,
					statusFilter: null,
					selectedLessonTypeId: null,
					debouncedSearchQuery: '',
					sortColumn: null,
					sortDirection: null,
					currentPage: 1,
					rowsPerPage: 10,
				}),
			).toEqual({ kind: 'skipped' });
		});

		it('returns success with one agreement row from paginated RPC', async () => {
			const outcome = await executeAgreementsPageLoad({
				authLoading: false,
				hasAccess: true,
				statusFilter: null,
				selectedLessonTypeId: null,
				debouncedSearchQuery: '',
				sortColumn: null,
				sortDirection: null,
				currentPage: 1,
				rowsPerPage: 10,
			});
			expect(outcome).toEqual({
				kind: 'success',
				agreements: [
					expect.objectContaining({
						id: 'agreement-1',
						student_user_id: 'student-1',
						teacher_user_id: 'teacher-1',
						student: expect.objectContaining({ first_name: 'Anna' }),
						teacher: expect.objectContaining({ first_name: 'Piet' }),
					}),
				],
				totalCount: 1,
			});
		});

		it('returns error when the RPC fails', async () => {
			rpcResult = { data: null, error: { message: 'Bad Request' } };
			expect(
				await executeAgreementsPageLoad({
					authLoading: false,
					hasAccess: true,
					statusFilter: null,
					selectedLessonTypeId: null,
					debouncedSearchQuery: '',
					sortColumn: 'student',
					sortDirection: 'asc',
					currentPage: 1,
					rowsPerPage: 10,
				}),
			).toEqual({ kind: 'error' });
		});
	});
});
