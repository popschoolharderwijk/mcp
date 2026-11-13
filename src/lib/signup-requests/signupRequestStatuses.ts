import type { Tables } from '@/integrations/supabase/types';

export type SignupRequestStatus = Tables<'lesson_signup_requests'>['status'];

export const OPEN_SIGNUP_REQUEST_STATUSES = ['pending', 'trial_scheduled'] as const;

export const SIGNUP_REQUEST_STATUS_FILTER_OPEN = 'open';

function isOpenSignupRequestStatus(status: SignupRequestStatus): boolean {
	return OPEN_SIGNUP_REQUEST_STATUSES.some((openStatus) => openStatus === status);
}

export function signupRequestMatchesStatusFilter(status: SignupRequestStatus, filter: string | null): boolean {
	if (!filter) return true;
	if (filter === SIGNUP_REQUEST_STATUS_FILTER_OPEN) return isOpenSignupRequestStatus(status);
	return status === filter;
}

export const SIGNUP_REQUEST_STATUS_LABELS: Record<SignupRequestStatus, string> = {
	pending: 'In afwachting',
	approved: 'Goedgekeurd',
	rejected: 'Afgewezen',
	trial_scheduled: 'Proefles ingepland',
};
