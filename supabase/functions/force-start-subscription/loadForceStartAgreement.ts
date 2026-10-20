import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { resolveForceStartAgreementGate } from '../_shared/forceStartSubscriptionHandlerPure.ts';
import { jsonResponse } from '../_shared/http.ts';
import { findOpenSubscription } from '../_shared/subscriptionSchedule.ts';

export async function loadForceStartAgreement(
	admin: SupabaseClient,
	lessonAgreementId: string,
): Promise<{ ok: true; scheduleId: string } | { ok: false; response: Response }> {
	const { data: row, error: agErr } = await admin
		.from('lesson_agreements')
		.select('id')
		.eq('id', lessonAgreementId)
		.maybeSingle();
	const subscription = row ? await findOpenSubscription(admin, lessonAgreementId) : null;
	const agreement = row ? { id: row.id as string, stripe_schedule_id: subscription?.stripe_schedule_id ?? null } : null;

	const gateError = resolveForceStartAgreementGate(agreement, agErr?.message);
	if (gateError) return { ok: false, response: jsonResponse(gateError.status, { error: gateError.error }) };

	return { ok: true, scheduleId: agreement?.stripe_schedule_id as string };
}
