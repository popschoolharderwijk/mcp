import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type Stripe from 'npm:stripe@17.5.0';
import { subscriptionToState } from './stripe-subscription-mapping.ts';
import { writeSubscriptionState } from './subscription-storage.ts';

export { readScheduleBillingDetails } from './force-start-subscription-pure.ts';

export async function cancelScheduleIfActive(
	stripe: Stripe,
	scheduleId: string,
	status: Stripe.SubscriptionSchedule.Status,
): Promise<void> {
	if (status === 'canceled') return;
	await stripe.subscriptionSchedules.cancel(scheduleId);
}

export async function createForcedSubscription(
	stripe: Stripe,
	input: {
		customerId: string;
		priceId: string;
		lessonAgreementId: string;
		scheduleId: string;
		defaultPaymentMethod?: string;
	},
): Promise<Stripe.Subscription> {
	return stripe.subscriptions.create({
		customer: input.customerId,
		items: [{ price: input.priceId, quantity: 1 }],
		collection_method: 'charge_automatically',
		proration_behavior: 'none',
		...(input.defaultPaymentMethod ? { default_payment_method: input.defaultPaymentMethod } : {}),
		metadata: {
			lesson_agreement_id: input.lessonAgreementId,
			forced_start: 'true',
			original_schedule_id: input.scheduleId,
		},
		expand: ['default_payment_method', 'latest_invoice'],
	});
}

export async function persistForcedSubscription(
	admin: SupabaseClient,
	lessonAgreementId: string,
	customerId: string,
	priceId: string,
	subscription: Stripe.Subscription,
): Promise<void> {
	const state = subscriptionToState(subscription);
	if (!state) {
		throw new Error('Forced subscription missing lesson_agreement_id metadata');
	}

	await writeSubscriptionState(admin, {
		...state,
		lesson_agreement_id: lessonAgreementId,
		stripe_customer_id: customerId,
		stripe_price_id: priceId,
		stripe_schedule_id: null,
	});
	await admin.from('lesson_agreements').update({ stripe_schedule_id: null }).eq('id', lessonAgreementId);
}
