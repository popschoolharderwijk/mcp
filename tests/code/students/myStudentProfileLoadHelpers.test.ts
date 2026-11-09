import { afterEach, beforeAll, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';
import * as signupRequestMappers from '../../../src/lib/signup-requests/signupRequestMappers';

let studentResult: { data: unknown; error: { message: string } | null } = { data: null, error: null };
let profileResult: { data: unknown; error: { message: string } | null } = { data: null, error: null };

mock.module('sonner', () => ({
	toast: {
		error: () => {},
	},
}));

mock.module('../../../src/integrations/supabase/client', () => ({
	supabase: {
		from: (table: string) => ({
			select: () => ({
				eq: () => ({
					single: () => Promise.resolve(table === 'students' ? studentResult : profileResult),
				}),
			}),
		}),
	},
}));

mock.module('../../../src/lib/students/fetchStudentAgreements', () => ({
	fetchStudentAgreementsForProfile: async () => [{ id: 'agreement-1' }],
	fetchStudentAgreementsWithRelations: async () => [{ id: 'agreement-1' }],
}));

describe('loadMyStudentProfileData', () => {
	let loadMyStudentProfileData: typeof import('../../../src/lib/students/myStudentProfileLoadHelpers').loadMyStudentProfileData;

	beforeAll(async () => {
		({ loadMyStudentProfileData } = await import('../../../src/lib/students/myStudentProfileLoadHelpers'));
	});

	beforeEach(() => {
		studentResult = {
			data: {
				user_id: 'user-1',
				parent_name: null,
				parent_email: null,
				parent_phone_number: null,
			},
			error: null,
		};
		profileResult = {
			data: {
				email: 'student@example.com',
				first_name: 'Anna',
				last_name: 'Leerling',
				phone_number: null,
				avatar_url: null,
			},
			error: null,
		};
		spyOn(signupRequestMappers, 'fetchSignupRequestsByEmail').mockResolvedValue([{ id: 'request-1' } as never]);
	});

	afterEach(() => {
		mock.restore();
	});

	it('loads profile, agreements, and signup requests', async () => {
		const outcome = await loadMyStudentProfileData('user-1');
		expect(outcome).toEqual(
			expect.objectContaining({
				kind: 'success',
				profile: {
					profile: {
						email: 'student@example.com',
						first_name: 'Anna',
						last_name: 'Leerling',
						phone_number: null,
						avatar_url: null,
					},
					student: {
						user_id: 'user-1',
						parent_name: null,
						parent_email: null,
						parent_phone_number: null,
					},
				},
				agreements: [expect.objectContaining({ id: 'agreement-1' })],
				signupRequests: [expect.objectContaining({ id: 'request-1' })],
			}),
		);
	});

	it('returns error when student lookup fails', async () => {
		studentResult = { data: null, error: { message: 'missing student' } };
		expect(await loadMyStudentProfileData('user-1')).toEqual({ kind: 'error' });
	});
});

describe('applyMyStudentProfileLoadOutcome', () => {
	let applyMyStudentProfileLoadOutcome: typeof import('../../../src/lib/students/myStudentProfileLoadHelpers').applyMyStudentProfileLoadOutcome;

	beforeAll(async () => {
		({ applyMyStudentProfileLoadOutcome } = await import('../../../src/lib/students/myStudentProfileLoadHelpers'));
	});

	it('applies success outcome and returns true', () => {
		let profileApplied = false;
		let agreementCount = -1;
		let requestCount = -1;
		const applied = applyMyStudentProfileLoadOutcome(
			{
				kind: 'success',
				profile: {
					profile: {
						email: 'student@example.com',
						first_name: 'Anna',
						last_name: 'Leerling',
						phone_number: null,
						avatar_url: null,
					},
					student: {
						user_id: 'user-1',
						parent_name: null,
						parent_email: null,
						parent_phone_number: null,
					},
				},
				agreements: [{ id: 'agreement-1' } as never],
				signupRequests: [{ id: 'request-1' } as never],
			},
			() => {
				profileApplied = true;
			},
			(value) => {
				agreementCount = value.length;
			},
			(value) => {
				requestCount = value.length;
			},
		);
		expect(applied).toBe(true);
		expect(profileApplied).toBe(true);
		expect(agreementCount).toBe(1);
		expect(requestCount).toBe(1);
	});
});
