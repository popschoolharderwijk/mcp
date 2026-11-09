import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { NavigateFunction } from 'react-router-dom';
import { processSignupRequest } from '../../../src/lib/signup-requests/signupRequestsPageControllerHelpers';
import type { SignupRequestRowBase } from '../../../src/lib/signup-requests/signupRequestsPageHelpers';

let invokeResult: { data: unknown; error: { message: string } | null } = { data: null, error: null };

mock.module('sonner', () => ({
	toast: {
		error: () => {},
		success: () => {},
	},
}));

mock.module('../../../src/integrations/supabase/client', () => ({
	supabase: {
		functions: {
			invoke: async () => invokeResult,
		},
	},
}));

mock.module('@/integrations/supabase/client', () => ({
	supabase: {
		functions: {
			invoke: async () => invokeResult,
		},
	},
}));

function mockSignupRequestRow(overrides: Partial<SignupRequestRowBase> = {}): SignupRequestRowBase {
	return {
		id: 'req-1',
		first_name: 'Anna',
		last_name: 'Bakker',
		email: 'anna@example.com',
		phone_number: '0612345678',
		parent_name: null,
		parent_email: null,
		parent_phone_number: null,
		date_of_birth: '2010-05-01',
		notes: null,
		status: 'pending',
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z',
		processed_at: null,
		processed_by: null,
		created_by: null,
		updated_by: null,
		created_agreement_id: null,
		lesson_type_id: 'lt-1',
		lesson_group_id: null,
		lesson_type_option_id: 'opt-1',
		lesson_type_name: 'Piano',
		lesson_group_name: null,
		is_group_lesson: false,
		option_label: null,
		trial_scheduled_date: null,
		trial_scheduled_time: null,
		trial_teacher_name: null,
		...overrides,
	};
}

const row = mockSignupRequestRow();

describe('processSignupRequest', () => {
	const navigateCalls: string[] = [];
	const recordNavigate: NavigateFunction = (to) => {
		navigateCalls.push(typeof to === 'string' ? to : String(to));
	};

	beforeEach(() => {
		invokeResult = { data: null, error: null };
		navigateCalls.length = 0;
	});

	it('shows invoke error message when invoke fails', async () => {
		invokeResult = { data: null, error: { message: 'Network error' } };
		let reloaded = false;
		await processSignupRequest({
			row,
			navigate: recordNavigate,
			reload: () => {
				reloaded = true;
			},
		});
		expect(navigateCalls).toEqual([]);
		expect(reloaded).toBe(false);
	});

	it('shows response error when invoke succeeds with error payload', async () => {
		invokeResult = { data: { error: 'Invalid request' }, error: null };
		await processSignupRequest({
			row,
			navigate: recordNavigate,
			reload: () => {},
		});
		expect(navigateCalls).toEqual([]);
	});

	it('reloads page for group lessons without wizard navigation', async () => {
		invokeResult = { data: { student_user_id: 'user-1' }, error: null };
		let reloaded = false;
		await processSignupRequest({
			row: mockSignupRequestRow({ is_group_lesson: true, lesson_group_id: 'group-1' }),
			navigate: recordNavigate,
			reload: () => {
				reloaded = true;
			},
		});
		expect(reloaded).toBe(true);
		expect(navigateCalls).toEqual([]);
	});

	it('navigates to agreement wizard on successful approve', async () => {
		invokeResult = { data: { student_user_id: 'user-1' }, error: null };
		await processSignupRequest({
			row,
			navigate: recordNavigate,
			reload: () => {},
		});
		expect(navigateCalls).toEqual([
			'/agreements/new?fromRequest=req-1&studentUserId=user-1&lessonTypeId=lt-1&optionId=opt-1',
		]);
	});
});
