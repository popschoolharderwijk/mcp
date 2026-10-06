import { afterEach, beforeAll, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';
import type { SignupRequestDetail } from '../../../src/components/students/SignupRequestDialog';
import * as signupRequestMappers from '../../../src/lib/signup-requests/signupRequestMappers';
import type { LessonAgreementWithTeacher } from '../../../src/types/lesson-agreements';

let profileResult: { data: unknown; error: unknown } = { data: null, error: null };
let studentResult: { data: unknown; error: unknown } = { data: null, error: null };

const studentRowFields = {
	user_id: 'user-1',
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

const mockAgreement: LessonAgreementWithTeacher = {
	id: 'agreement-1',
	day_of_week: 1,
	start_time: '09:00:00',
	start_date: '2026-09-01',
	end_date: null,
	is_active: true,
	notes: null,
	duration_minutes: 45,
	frequency: 'weekly',
	price_per_lesson: 30,
	teacher: { first_name: 'Piet', last_name: 'Docent', avatar_url: null },
	lesson_type: { id: 'lt-1', name: 'Piano', icon: 'piano', color: '#000000' },
};

const mockSignupRequest: SignupRequestDetail = {
	id: 'signup-1',
	first_name: 'Anna',
	last_name: 'Bakker',
	email: 'jan@test.nl',
	phone_number: null,
	parent_name: null,
	parent_email: null,
	parent_phone_number: null,
	date_of_birth: null,
	notes: null,
	status: 'pending',
	created_at: '2026-01-01T00:00:00Z',
	processed_at: null,
	lesson_type_name: 'Piano',
	lesson_group_name: null,
};

const tableMaybeSingle: Record<string, () => Promise<{ data: unknown; error: unknown }>> = {
	profiles: () => Promise.resolve(profileResult),
	students: () => Promise.resolve(studentResult),
};

const supabaseMock = {
	from: (table: string) => ({
		select: () => ({
			eq: () => ({
				maybeSingle: () => tableMaybeSingle[table](),
			}),
		}),
	}),
};

mock.module('sonner', () => ({
	toast: { error: () => {} },
}));

mock.module('../../../src/lib/students/fetchStudentAgreements', () => ({
	fetchStudentAgreementsForProfile: async () => [mockAgreement],
	fetchStudentAgreementsWithRelations: async () => [mockAgreement],
}));

describe('runStudentDetailPageLoad', () => {
	let runStudentDetailPageLoad: typeof import('../../../src/lib/students/studentDetailPageLoadHelpers').runStudentDetailPageLoad;
	let mergeStudentDetailRecord: typeof import('../../../src/lib/students/studentDetailPageLoadHelpers').mergeStudentDetailRecord;

	beforeAll(async () => {
		({ runStudentDetailPageLoad, mergeStudentDetailRecord } = await import(
			'../../../src/lib/students/studentDetailPageLoadHelpers'
		));
	});

	beforeEach(() => {
		profileResult = {
			data: {
				user_id: 'user-1',
				email: 'jan@test.nl',
				first_name: 'Jan',
				last_name: 'Leerling',
				phone_number: null,
				avatar_url: null,
			},
			error: null,
		};
		studentResult = {
			data: studentRowFields,
			error: null,
		};
		spyOn(signupRequestMappers, 'fetchSignupRequestsByEmail').mockResolvedValue([mockSignupRequest]);
		spyOn(signupRequestMappers, 'fetchSignupRequestsByEmails').mockResolvedValue(new Map());
	});

	afterEach(() => {
		mock.restore();
	});

	it('returns profile student agreements and signup requests', async () => {
		const result = await runStudentDetailPageLoad(supabaseMock as never, 'user-1');
		expect(result).toEqual({
			profile: {
				user_id: 'user-1',
				email: 'jan@test.nl',
				first_name: 'Jan',
				last_name: 'Leerling',
				phone_number: null,
				avatar_url: null,
			},
			student: {
				...studentRowFields,
				email: 'jan@test.nl',
				first_name: 'Jan',
				last_name: 'Leerling',
				phone_number: null,
				avatar_url: null,
			},
			agreements: [mockAgreement],
			signupRequests: [mockSignupRequest],
		});
	});

	it('returns null when profile is missing', async () => {
		profileResult = { data: null, error: null };
		const result = await runStudentDetailPageLoad(supabaseMock as never, 'user-1');
		expect(result).toBeNull();
	});

	it('returns null when student row is missing', async () => {
		studentResult = { data: null, error: null };
		const result = await runStudentDetailPageLoad(supabaseMock as never, 'user-1');
		expect(result).toBeNull();
	});

	it('merges profile fields onto the student row', () => {
		expect(
			mergeStudentDetailRecord(
				{
					user_id: 'user-1',
					email: 'jan@test.nl',
					first_name: 'Jan',
					last_name: 'Leerling',
					phone_number: '0612345678',
					avatar_url: null,
				},
				studentRowFields as never,
			),
		).toEqual({
			...studentRowFields,
			email: 'jan@test.nl',
			first_name: 'Jan',
			last_name: 'Leerling',
			phone_number: '0612345678',
			avatar_url: null,
		});
	});
});

describe('applyStudentDetailHookLoadOutcome', () => {
	let applyStudentDetailHookLoadOutcome: typeof import('../../../src/lib/students/studentDetailPageLoadHelpers').applyStudentDetailHookLoadOutcome;

	beforeAll(async () => {
		({ applyStudentDetailHookLoadOutcome } = await import(
			'../../../src/lib/students/studentDetailPageLoadHelpers'
		));
	});

	it('clears loading for empty outcomes', () => {
		let loading: boolean | null = true;
		applyStudentDetailHookLoadOutcome(
			{ kind: 'empty' },
			{
				setLoading: (value) => {
					loading = value;
				},
				applySuccess: () => {
					throw new Error('should not apply success');
				},
			},
		);
		expect(loading).toBe(false);
	});

	it('applies success data then clears loading', () => {
		let loading = true;
		let appliedUserId = '';
		const result = {
			profile: {
				user_id: 'user-1',
				email: 'jan@test.nl',
				first_name: 'Jan',
				last_name: 'Leerling',
				phone_number: null,
				avatar_url: null,
			},
			student: studentRowFields as never,
			agreements: [mockAgreement],
			signupRequests: [mockSignupRequest],
		};
		applyStudentDetailHookLoadOutcome(
			{ kind: 'success', result },
			{
				setLoading: (value) => {
					loading = value;
				},
				applySuccess: (value) => {
					appliedUserId = value.profile.user_id;
				},
			},
		);
		expect(appliedUserId).toBe('user-1');
		expect(loading).toBe(false);
	});

	it('clears loading for error outcomes without applying success', () => {
		let loading: boolean | null = true;
		let successCalled = false;
		applyStudentDetailHookLoadOutcome(
			{ kind: 'error', error: new Error('boom') },
			{
				setLoading: (value) => {
					loading = value;
				},
				applySuccess: () => {
					successCalled = true;
				},
			},
		);
		expect(successCalled).toBe(false);
		expect(loading).toBe(false);
	});
});
