import { useCallback, useEffect, useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { OPEN_SIGNUP_REQUEST_STATUSES } from '@/lib/signup-requests/signupRequestStatuses';
import { processSignupRequest, rejectSignupRequest } from '@/lib/signup-requests/signupRequestsPageControllerHelpers';
import {
	enrichSignupRequestRows,
	mapSignupRequestBaseRow,
	type SignupRequestRowBase,
} from '@/lib/signup-requests/signupRequestsPageHelpers';
import { buildSignupRequestColumns, type SignupAction } from '@/lib/signup-requests/signupRequestsTableColumns';

interface UseSignupRequestsPageControllerParams {
	isPrivileged: boolean;
	navigate: NavigateFunction;
	statusFilter: 'pending' | 'all';
}

export function useSignupRequestsPageController(params: UseSignupRequestsPageControllerParams) {
	const [rows, setRows] = useState<SignupRequestRowBase[]>([]);
	const [loading, setLoading] = useState(true);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [trialFor, setTrialFor] = useState<SignupRequestRowBase | null>(null);

	const loadSignupRequests = useCallback(() => {
		if (!params.isPrivileged) return;

		setLoading(true);
		let query = supabase
			.from('lesson_signup_requests')
			.select('*, lesson_types(id, name, is_group_lesson), lesson_groups(id, name)')
			.order('created_at', { ascending: false });
		if (params.statusFilter === 'pending') {
			query = query.in('status', OPEN_SIGNUP_REQUEST_STATUSES);
		}

		void query.then(async ({ data, error }) => {
			if (error) {
				setLoading(false);
				toast.error('Fout bij laden aanmeldingen');
				return;
			}

			const baseRows = (data ?? []).map(mapSignupRequestBaseRow);
			setRows(await enrichSignupRequestRows(baseRows));
			setLoading(false);
		});
	}, [params.isPrivileged, params.statusFilter]);

	useEffect(() => {
		loadSignupRequests();
	}, [loadSignupRequests]);

	const runAction = useCallback(
		async (action: SignupAction) => {
			setBusyId(action.row.id);
			if (action.kind === 'reject') {
				await rejectSignupRequest(action.row, loadSignupRequests);
			} else {
				await processSignupRequest({
					row: action.row,
					navigate: params.navigate,
					reload: loadSignupRequests,
				});
			}
			setBusyId(null);
		},
		[loadSignupRequests, params.navigate],
	);

	const columns = buildSignupRequestColumns(busyId, runAction, setTrialFor);

	return {
		rows,
		loading,
		trialFor,
		setTrialFor,
		loadSignupRequests,
		columns,
	};
}
