import type { QuickFilterGroup } from '@/components/ui/data-table';
import {
	SIGNUP_REQUEST_STATUS_FILTER_OPEN,
	SIGNUP_REQUEST_STATUS_LABELS,
	type SignupRequestStatus,
} from '@/lib/signup-requests/signupRequestStatuses';
import type { SignupRequestRowBase } from '@/lib/signup-requests/signupRequestsPageHelpers';

export type SignupRequestsPageGate = 'loading' | 'denied' | 'ready';

export function resolveSignupRequestsPageGate(isLoading: boolean, isPrivileged: boolean): SignupRequestsPageGate {
	if (isLoading) return 'loading';
	if (!isPrivileged) return 'denied';
	return 'ready';
}

const SIGNUP_STATUS_FILTER_ORDER: SignupRequestStatus[] = ['pending', 'trial_scheduled', 'approved', 'rejected'];

export function buildSignupRequestStatusQuickFilter(
	value: string | null,
	onChange: (value: string | null) => void,
): QuickFilterGroup {
	return {
		label: 'Status',
		value,
		showAllOption: true,
		allOptionLabel: 'Alle',
		options: [
			{ id: SIGNUP_REQUEST_STATUS_FILTER_OPEN, label: 'Open' },
			...SIGNUP_STATUS_FILTER_ORDER.map((status) => ({
				id: status,
				label: SIGNUP_REQUEST_STATUS_LABELS[status],
			})),
		],
		onChange,
	};
}

export interface ScheduleTrialSignupRequestPayload {
	id: string;
	first_name: string;
	last_name: string;
	email: string;
	lesson_type_id: string;
	lesson_type_option_id: string | null;
}

export function buildScheduleTrialSignupRequestPayload(
	trialFor: SignupRequestRowBase | null,
): ScheduleTrialSignupRequestPayload | null {
	if (!trialFor) return null;
	return {
		id: trialFor.id,
		first_name: trialFor.first_name,
		last_name: trialFor.last_name,
		email: trialFor.email,
		lesson_type_id: trialFor.lesson_type_id,
		lesson_type_option_id: trialFor.lesson_type_option_id,
	};
}
