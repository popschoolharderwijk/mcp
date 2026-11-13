import { useCallback, useEffect, useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { deleteSignupRequest, processSignupRequest } from '@/lib/signup-requests/signupRequestsPageControllerHelpers';
import {
	enrichSignupRequestRows,
	mapSignupRequestBaseRow,
	type SignupRequestRowBase,
} from '@/lib/signup-requests/signupRequestsPageHelpers';
import { buildSignupRequestColumns } from '@/lib/signup-requests/signupRequestsTableColumns';

interface UseSignupRequestsPageControllerParams {
	isPrivileged: boolean;
	navigate: NavigateFunction;
}

export function useSignupRequestsPageController(params: UseSignupRequestsPageControllerParams) {
	const [rows, setRows] = useState<SignupRequestRowBase[]>([]);
	const [loading, setLoading] = useState(true);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [selected, setSelected] = useState<SignupRequestRowBase | null>(null);
	const [trialFor, setTrialFor] = useState<SignupRequestRowBase | null>(null);

	const loadSignupRequests = useCallback(() => {
		if (!params.isPrivileged) return;

		setLoading(true);
		const query = supabase
			.from('lesson_signup_requests')
			.select('*, lesson_types(id, name, is_group_lesson), lesson_groups(id, name)')
			.order('created_at', { ascending: false });

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
	}, [params.isPrivileged]);

	useEffect(() => {
		loadSignupRequests();
	}, [loadSignupRequests]);

	const processSelected = useCallback(async () => {
		if (!selected) return;
		setBusyId(selected.id);
		await processSignupRequest({
			row: selected,
			navigate: params.navigate,
			reload: loadSignupRequests,
		});
		setBusyId(null);
		setSelected(null);
	}, [loadSignupRequests, params.navigate, selected]);

	const deleteSelected = useCallback(async () => {
		if (!selected) return;
		await deleteSignupRequest(selected);
		setSelected(null);
		loadSignupRequests();
	}, [loadSignupRequests, selected]);

	const columns = buildSignupRequestColumns();

	return {
		rows,
		loading,
		busyId,
		selected,
		setSelected,
		processSelected,
		deleteSelected,
		trialFor,
		setTrialFor,
		loadSignupRequests,
		columns,
	};
}
