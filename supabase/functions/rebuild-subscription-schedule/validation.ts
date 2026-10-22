import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse } from '../_shared/http.ts';
import type { RebuildScheduleBody } from './validationHelpers.ts';

export type { RebuildScheduleBody } from './validationHelpers.ts';
export {
	buildRebuildScheduleFailureResult,
	buildRebuildScheduleResponse,
	buildRebuildScheduleSuccessResult,
	validateRebuildScheduleBody,
} from './validationHelpers.ts';

export async function resolveRebuildAgreementIds(
	admin: SupabaseClient,
	body: RebuildScheduleBody,
): Promise<{ agreementIds: string[]; error: Response | null }> {
	if (body.lesson_agreement_id) {
		return { agreementIds: [body.lesson_agreement_id], error: null };
	}

	const { data, error } = await admin
		.from('lesson_agreements')
		.select('id')
		.eq('lesson_type_id', body.lesson_type_id as string)
		.eq('is_active', true)
		.not('stripe_schedule_id', 'is', null);

	if (error) {
		return { agreementIds: [], error: jsonResponse(500, { error: error.message }) };
	}

	return { agreementIds: (data ?? []).map((row) => row.id), error: null };
}
