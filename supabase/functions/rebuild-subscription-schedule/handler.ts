import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse } from '../_shared/http.ts';
import { getSafeErrorMessage, getStripe } from '../_shared/stripe.ts';
import { recordRebuildError, syncAgreementSchedule } from '../_shared/subscriptionSchedule.ts';
import { authenticateRebuildScheduleRequest } from './rebuildSubscriptionScheduleHandlerPure.ts';
import {
	buildRebuildScheduleFailureResult,
	buildRebuildScheduleResponse,
	buildRebuildScheduleSuccessResult,
	resolveRebuildAgreementIds,
} from './validation.ts';

export async function handleRebuildSubscriptionScheduleRequest(req: Request): Promise<Response> {
	const auth = await authenticateRebuildScheduleRequest(req);
	if (!auth.ok) return auth.response;

	try {
		const stripe = getStripe();
		const resolved = await resolveRebuildAgreementIds(auth.admin, auth.body);
		if (resolved.error) return resolved.error;

		const results = await rebuildAllSchedules(auth.admin, stripe, resolved.agreementIds);
		const response = buildRebuildScheduleResponse(results);
		return jsonResponse(response.status, response.body);
	} catch (err) {
		console.error('rebuild-subscription-schedule error', err);
		return jsonResponse(500, { error: getSafeErrorMessage(err, 'Kon schedule niet bijwerken') });
	}
}

async function rebuildAllSchedules(admin: SupabaseClient, stripe: ReturnType<typeof getStripe>, agreementIds: string[]) {
	const results: Array<{ lesson_agreement_id: string; ok: boolean; detail?: unknown; error?: string }> = [];
	for (const id of agreementIds) {
		results.push(await rebuildSingleSchedule(admin, stripe, id));
	}
	return results;
}

async function rebuildSingleSchedule(admin: SupabaseClient, stripe: ReturnType<typeof getStripe>, lessonAgreementId: string) {
	try {
		const detail = await syncAgreementSchedule(admin, stripe, { agreementId: lessonAgreementId });
		return buildRebuildScheduleSuccessResult(lessonAgreementId, detail);
	} catch (err) {
		return buildRebuildScheduleFailureResult(
			lessonAgreementId,
			await recordRebuildError(admin, lessonAgreementId, err ?? getSafeErrorMessage(err)),
		);
	}
}
