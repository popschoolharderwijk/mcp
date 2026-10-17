import { afterEach, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';
import type { SignupRequestDetail } from '../../../src/components/students/SignupRequestDialog';
import type { StudentWithAgreementsRaw } from '../../../src/types/students';

const studentRowFields = {
	created_at: '2026-01-01T00:00:00Z',
	created_by: null,
	date_of_birth: null,
	debtor_address: null,
	debtor_city: null,
	debtor_info_same_as_student: true,
	debtor_name: null,
	debtor_postal_code: null,
	parent_email: null,
	parent_name: null,
	parent_phone_number: null,
	updated_at: '2026-01-01T00:00:00Z',
	updated_by: null,
};

const rawStudent: StudentWithAgreementsRaw = {
	user_id: 'student-1',
	active_agreements_count: 0,
	agreements_count: 0,
	...studentRowFields,
	profile: {
		user_id: 'student-1',
		first_name: 'Anna',
		last_name: 'Jansen',
		email: 'student@example.com',
		avatar_url: null,
		phone_number: null,
	},
	agreements: [],
};

let rpcResult: { data: unknown; error: { message: string } | null } = {
	data: { data: [rawStudent], total_count: 1 },
	error: null,
};

mock.module('sonner', () => ({
	toast: {
		error: () => {},
		success: () => {},
	},
}));

const supabaseMock = {
	rpc: async () => rpcResult,
	from: () => ({
		delete: () => ({
			in: async () => ({ error: null }),
		}),
	}),
	functions: {
		invoke: async () => ({ error: null }),
	},
};

mock.module('../../../src/integrations/supabase/client', () => ({
	supabase: supabaseMock,
}));

mock.module('@/integrations/supabase/client', () => ({
	supabase: supabaseMock,
}));

mock.module('../../../src/lib/signup-requests/signupRequestMappers', () => ({
	fetchSignupRequestsByEmail: async () => [],
	fetchSignupRequestsByEmails: async () => new Map<string, SignupRequestDetail[]>(),
}));

mock.module('@/lib/signup-requests/signupRequestMappers', () => ({
	fetchSignupRequestsByEmail: async () => [],
	fetchSignupRequestsByEmails: async () => new Map<string, SignupRequestDetail[]>(),
}));

mock.module('../../../src/lib/students/fetchStudentAgreements', () => ({
	fetchStudentAgreementsWithRelations: async () => [{ id: 'agreement-1' }],
	fetchStudentAgreementsForProfile: async () => [{ id: 'agreement-1' }],
}));

mock.module('@/lib/students/fetchStudentAgreements', () => ({
	fetchStudentAgreementsWithRelations: async () => [{ id: 'agreement-1' }],
	fetchStudentAgreementsForProfile: async () => [{ id: 'agreement-1' }],
}));

describe('studentsPageControllerHelpers', () => {
	let applyStudentsPageLoadOutcome: typeof import('../../../src/lib/students/studentsPageControllerHelpers').applyStudentsPageLoadOutcome;
	let executeStudentsPageLoad: typeof import('../../../src/lib/students/studentsPageControllerHelpers').executeStudentsPageLoad;
	let runStudentPageAction: typeof import('../../../src/lib/students/studentsPageControllerHelpers').runStudentPageAction;

	beforeAll(async () => {
		({ applyStudentsPageLoadOutcome, executeStudentsPageLoad, runStudentPageAction } = await import(
			'../../../src/lib/students/studentsPageControllerHelpers'
		));
	});

	beforeEach(() => {
		rpcResult = {
			data: {
				data: [rawStudent],
				total_count: 1,
			},
			error: null,
		};
	});

	afterEach(() => {
		mock.restore();
	});

	describe('applyStudentsPageLoadOutcome', () => {
		it('applies success outcome and returns true', () => {
			let totalCount = 0;
			let appliedStudentCount = -1;
			const requests = new Map<string, SignupRequestDetail[]>();
			const outcome = {
				kind: 'success' as const,
				students: [],
				totalCount: 12,
				requestsByEmail: requests,
			};
			const shouldStopLoading = applyStudentsPageLoadOutcome(
				outcome,
				(value) => {
					appliedStudentCount = value.length;
				},
				(value) => {
					totalCount = value;
				},
				(value) => {
					for (const [key, entry] of value.entries()) {
						requests.set(key, entry);
					}
				},
			);
			expect(shouldStopLoading).toBe(true);
			expect(totalCount).toBe(12);
			expect(appliedStudentCount).toBe(0);
		});

		it('returns false for skipped outcome', () => {
			expect(
				applyStudentsPageLoadOutcome(
					{ kind: 'skipped' },
					() => {},
					() => {},
					() => {},
				),
			).toBe(false);
		});
	});

	describe('runStudentPageAction', () => {
		const student = { user_id: 'student-1', agreements: [] } as never;

		it('opens delete dialog for delete action with fetched agreements', async () => {
			const openedAgreements: Array<{ id: string }> = [];
			await runStudentPageAction({ kind: 'delete', student }, null, {
				setDeleteDialog: (value) => {
					openedAgreements.push(...(value?.student.agreements ?? []));
				},
				loadStudents: () => {},
			});
			expect(openedAgreements).toEqual([{ id: 'agreement-1' }]);
		});

		it('executes delete and reloads students for confirm delete', async () => {
			let dialogCleared = false;
			let studentsReloaded = false;
			await runStudentPageAction(
				{ kind: 'confirm-delete' },
				{ open: true, student, deleteUser: false },
				{
					setDeleteDialog: (value) => {
						dialogCleared = value === null;
					},
					loadStudents: () => {
						studentsReloaded = true;
					},
				},
			);
			expect(dialogCleared).toBe(true);
			expect(studentsReloaded).toBe(true);
		});
	});

	describe('executeStudentsPageLoad', () => {
		it('returns skipped when auth is loading', async () => {
			expect(
				await executeStudentsPageLoad({
					authLoading: true,
					hasAccess: true,
					limit: 10,
					offset: 0,
					search: '',
					statusFilter: 'all',
					lessonTypeId: null,
					sortColumn: null,
					sortDirection: null,
				}),
			).toEqual({ kind: 'skipped' });
		});

		it('returns success with flattened students', async () => {
			const outcome = await executeStudentsPageLoad({
				authLoading: false,
				hasAccess: true,
				limit: 10,
				offset: 0,
				search: '',
				statusFilter: 'all',
				lessonTypeId: null,
				sortColumn: null,
				sortDirection: null,
			});
			expect(outcome).toEqual({
				kind: 'success',
				students: [
					{
						user_id: 'student-1',
						email: 'student@example.com',
						active_agreements_count: 0,
						agreements_count: 0,
						first_name: 'Anna',
						last_name: 'Jansen',
						avatar_url: null,
						phone_number: null,
						agreements: [],
						...studentRowFields,
					},
				],
				totalCount: 1,
				requestsByEmail: new Map(),
			});
		});

		it('returns error when rpc fails', async () => {
			rpcResult = { data: null, error: { message: 'rpc failed' } };
			expect(
				await executeStudentsPageLoad({
					authLoading: false,
					hasAccess: true,
					limit: 10,
					offset: 0,
					search: '',
					statusFilter: 'all',
					lessonTypeId: null,
					sortColumn: null,
					sortDirection: null,
				}),
			).toEqual({ kind: 'error' });
		});
	});
});
