import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { resolveForceStartAgreementGate } from '../_shared/forceStartSubscriptionHandlerHelpers.ts';
import { jsonResponse } from '../_shared/http.ts';

export async function loadForceStartAgreement(
	admin: SupabaseClient,
	lessonAgreementId: string,
): Promise<{ ok: true; scheduleId: string } | { ok: false; response: Response }> {
	const { data: agreement, error: agErr } = await admin
		.from('lesson_agreements')
		.select('id, stripe_schedule_id')
		.eq('id', lessonAgreementId)
		.maybeSingle();

	const gateError = resolveForceStartAgreementGate(agreement, agErr?.message);
	if (gateError) return { ok: false, response: jsonResponse(gateError.status, { error: gateError.error }) };

	return { ok: true, scheduleId: agreement?.stripe_schedule_id as string };
}
