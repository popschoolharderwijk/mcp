import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse } from '../_shared/http.ts';
import {
	fromRequestBody,
	fromSignupRequest,
	isSignupRequestEligibleForTrialScheduling,
} from './resolveStudentDataPure.ts';
import type { Body, ResolvedStudentData, SignupRequestRow } from './types.ts';

export async function resolveStudentData(
	admin: SupabaseClient,
	body: Body,
): Promise<{ ok: true; data: ResolvedStudentData } | { ok: false; response: Response }> {
	if (body.signup_request_id) {
		const { data: req } = await admin
			.from('lesson_signup_requests')
			.select(
				'id, status, email, first_name, last_name, phone_number, date_of_birth, parent_name, parent_email, parent_phone_number, lesson_type_id, lesson_type_option_id',
			)
			.eq('id', body.signup_request_id)
			.maybeSingle();

		if (!req) return { ok: false, response: jsonResponse(404, { error: 'Aanmelding niet gevonden' }) };
		if (!isSignupRequestEligibleForTrialScheduling(req.status)) {
			return { ok: false, response: jsonResponse(409, { error: 'Aanmelding is al verwerkt' }) };
		}
		return { ok: true, data: fromSignupRequest(req as SignupRequestRow, body) };
	}

	return { ok: true, data: fromRequestBody(body) as ResolvedStudentData };
}
