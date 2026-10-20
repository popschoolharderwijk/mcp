import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse } from '../_shared/http.ts';
import type { RebuildScheduleBody } from './validationPure.ts';

export type { RebuildScheduleBody } from './validationPure.ts';
export {
	buildRebuildScheduleFailureResult,
	buildRebuildScheduleResponse,
	buildRebuildScheduleSuccessResult,
	validateRebuildScheduleBody,
} from './validationPure.ts';

export async function resolveRebuildAgreementIds(
	admin: SupabaseClient,
	body: RebuildScheduleBody,
): Promise<{ agreementIds: string[]; error: Response | null }> {
	if (body.lesson_agreement_id) {
		return { agreementIds: [body.lesson_agreement_id], error: null };
	}

	const { data, error } = await admin
		.from('subscriptions')
		.select('lesson_agreement_id, lesson_agreements!inner(lesson_type_id, is_active)')
		.eq('lesson_agreements.lesson_type_id', body.lesson_type_id as string)
		.eq('lesson_agreements.is_active', true)
		.not('stripe_schedule_id', 'is', null)
		.not('status', 'in', '(canceled,incomplete_expired)');

	if (error) {
		return { agreementIds: [], error: jsonResponse(500, { error: 'Kon abonnementen niet laden' }) };
	}

	return { agreementIds: [...new Set((data ?? []).map((row) => row.lesson_agreement_id as string))], error: null };
}
