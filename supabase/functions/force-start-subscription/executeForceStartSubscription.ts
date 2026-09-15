import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
	cancelScheduleIfActive,
	createForcedSubscription,
	persistForcedSubscription,
	readScheduleBillingDetails,
} from '../_shared/force-start-subscription-core.ts';
import {
	buildForceStartSuccessPayload,
	resolveForceStartBillingErrors,
	resolveForceStartScheduleStatusError,
} from '../_shared/forceStartSubscriptionHandlerPure.ts';
import { getStripe } from '../_shared/stripe.ts';

export async function executeForceStartSubscription(
	admin: SupabaseClient,
	lessonAgreementId: string,
	scheduleId: string,
): Promise<
	| { ok: true; payload: ReturnType<typeof buildForceStartSuccessPayload> }
	| { ok: false; status: number; error: string }
> {
	const stripe = getStripe();
	const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId, {
		expand: ['phases.items.price'],
	});

	const statusError = resolveForceStartScheduleStatusError(schedule.status);
	if (statusError) return { ok: false, ...statusError };

	const billing = readScheduleBillingDetails(schedule);
	const billingError = resolveForceStartBillingErrors(billing);
	if (billingError) return { ok: false, ...billingError };

	await cancelScheduleIfActive(stripe, scheduleId, schedule.status);

	const subscription = await createForcedSubscription(stripe, {
		customerId: billing.customerId as string,
		priceId: billing.priceId as string,
		lessonAgreementId,
		scheduleId,
		defaultPaymentMethod: billing.defaultPaymentMethod,
	});

	await persistForcedSubscription(
		admin,
		lessonAgreementId,
		billing.customerId as string,
		billing.priceId as string,
		subscription,
	);

	return { ok: true, payload: buildForceStartSuccessPayload(subscription) };
}
