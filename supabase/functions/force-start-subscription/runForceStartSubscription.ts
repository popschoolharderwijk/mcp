import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { ForceStartAgreementMeta } from '../_shared/force-start-subscription-core.ts';
import { jsonResponse } from '../_shared/http.ts';
import { getSafeErrorMessage } from '../_shared/stripe.ts';
import { executeForceStartSubscription } from './executeForceStartSubscription.ts';

export async function runForceStartSubscription(
	admin: SupabaseClient,
	agreement: ForceStartAgreementMeta,
	scheduleId: string,
): Promise<Response> {
	try {
		const result = await executeForceStartSubscription(admin, agreement, scheduleId);
		if (!result.ok) return jsonResponse(result.status, { error: result.error });
		return jsonResponse(200, result.payload);
	} catch (err) {
		console.error('force-start-subscription error', err);
		return jsonResponse(500, { error: getSafeErrorMessage(err, 'Kon abonnement niet forceren') });
	}
}
