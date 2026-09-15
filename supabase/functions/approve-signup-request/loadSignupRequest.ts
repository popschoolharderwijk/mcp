import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse } from '../_shared/http.ts';
import { validateSignupRequestStatus } from './loadSignupRequestPure.ts';
import type { SignupRequestRow } from './types.ts';

export async function loadSignupRequest(
	admin: SupabaseClient,
	requestId: string,
): Promise<{ ok: true; row: SignupRequestRow } | { ok: false; response: Response }> {
	const { data: reqRow, error: reqErr } = await admin
		.from('lesson_signup_requests')
		.select('*')
		.eq('id', requestId)
		.single();
	if (reqErr || !reqRow) return { ok: false, response: jsonResponse(404, { error: 'Aanmelding niet gevonden' }) };

	const statusError = validateSignupRequestStatus((reqRow as SignupRequestRow).status);
	if (statusError) return { ok: false, response: statusError };

	return { ok: true, row: reqRow as SignupRequestRow };
}
