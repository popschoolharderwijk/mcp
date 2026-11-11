import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { ForceStartAgreementMeta } from '../_shared/force-start-subscription-core.ts';
import { resolveForceStartAgreementGate } from '../_shared/forceStartSubscriptionHandlerHelpers.ts';
import { jsonResponse } from '../_shared/http.ts';

type ForceStartAgreementRow = ForceStartAgreementMeta & { stripe_schedule_id: string };

function buildLoadedForceStartResult(row: ForceStartAgreementRow): {
	scheduleId: string;
	agreement: ForceStartAgreementMeta;
} {
	return {
		scheduleId: row.stripe_schedule_id,
		agreement: {
			id: row.id,
			lesson_type_id: row.lesson_type_id,
			frequency: row.frequency,
			duration_minutes: row.duration_minutes,
		},
	};
}

export async function loadForceStartAgreement(
	admin: SupabaseClient,
	lessonAgreementId: string,
): Promise<{ ok: true; scheduleId: string; agreement: ForceStartAgreementMeta } | { ok: false; response: Response }> {
	const { data: agreement, error: agErr } = await admin
		.from('lesson_agreements')
		.select('id, stripe_schedule_id, lesson_type_id, frequency, duration_minutes')
		.eq('id', lessonAgreementId)
		.maybeSingle();

	const gateError = resolveForceStartAgreementGate(agreement, agErr?.message);
	if (gateError) return { ok: false, response: jsonResponse(gateError.status, { error: gateError.error }) };

	return { ok: true, ...buildLoadedForceStartResult(agreement as ForceStartAgreementRow) };
}
