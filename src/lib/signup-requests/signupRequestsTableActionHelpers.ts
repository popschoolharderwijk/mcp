import type { Tables } from '@/integrations/supabase/types';
import {
	canScheduleTrialForSignupRequest,
	isSignupRequestActionable,
} from '@/lib/signup-requests/signupRequestsTableFormatters';

export interface SignupRequestRowActionState {
	showActions: boolean;
	showTrialButton: boolean;
	isBusy: boolean;
}

export type SignupRequestDialogActionId = 'delete' | 'trial' | 'process';

export interface SignupRequestDialogActionItem {
	id: SignupRequestDialogActionId;
	disabled: boolean;
}

export function getSignupRequestRowActionState(
	status: Tables<'lesson_signup_requests'>['status'],
	rowId: string,
	busyId: string | null,
): SignupRequestRowActionState {
	return {
		showActions: isSignupRequestActionable(status),
		showTrialButton: canScheduleTrialForSignupRequest(status),
		isBusy: busyId === rowId,
	};
}

export function listSignupRequestDialogActions(
	row: { status: Tables<'lesson_signup_requests'>['status']; id: string } | null,
	busyId: string | null,
): SignupRequestDialogActionItem[] {
	if (!row) return [{ id: 'delete', disabled: false }];
	const state = getSignupRequestRowActionState(row.status, row.id, busyId);
	const actions: SignupRequestDialogActionItem[] = [{ id: 'delete', disabled: state.isBusy }];
	if (state.showTrialButton) actions.push({ id: 'trial', disabled: state.isBusy });
	if (state.showActions) actions.push({ id: 'process', disabled: state.isBusy });
	return actions;
}
