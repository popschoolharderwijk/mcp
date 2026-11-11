import Stripe from 'npm:stripe@17.5.0';
import {
	getStripeId,
	paymentMethodListTypeForFingerprintDedupe,
	readGeneratedSepaDebitPaymentMethodId,
	selectDuplicateFingerprintPaymentMethodIds,
} from './stripeHelpers.ts';

export { getSafeErrorMessage } from './errors.ts';
export { getStripeId } from './stripeHelpers.ts';

export function getStripe(): Stripe {
	const key = Deno.env.get('STRIPE_SECRET_KEY');
	if (!key) throw new Error('STRIPE_SECRET_KEY ontbreekt');
	return new Stripe(key, {
		apiVersion: '2024-11-20.acacia',
		httpClient: Stripe.createFetchHttpClient(),
	});
}

function getGeneratedSepaDebitPaymentMethodId(latestAttempt: unknown): string | null {
	return readGeneratedSepaDebitPaymentMethodId(latestAttempt);
}

export function getReusablePaymentMethodIdFromSetupIntent(setupIntent: Stripe.SetupIntent): string | null {
	return getGeneratedSepaDebitPaymentMethodId(setupIntent.latest_attempt) ?? getStripeId(setupIntent.payment_method);
}

async function detachPaymentMethodBestEffort(stripe: Stripe, paymentMethodId: string): Promise<void> {
	try {
		await stripe.paymentMethods.detach(paymentMethodId);
	} catch (e) {
		console.error('detach duplicate payment method failed', paymentMethodId, e);
	}
}

async function detachDuplicateFingerprintPaymentMethods(
	stripe: Stripe,
	customerId: string,
	kept: Stripe.PaymentMethod,
): Promise<void> {
	const type = paymentMethodListTypeForFingerprintDedupe(kept);
	if (!type) return;
	const listed = await stripe.paymentMethods.list({
		customer: customerId,
		type,
		limit: 100,
	});
	for (const duplicateId of selectDuplicateFingerprintPaymentMethodIds(kept, listed.data)) {
		await detachPaymentMethodBestEffort(stripe, duplicateId);
	}
}

export async function attachDefaultPaymentMethod(
	stripe: Stripe,
	customerId: string,
	paymentMethodId: string,
): Promise<void> {
	const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
	if (pm.type === 'ideal') {
		throw new Error(
			'iDEAL kan niet als herbruikbare betaalmethode worden opgeslagen; herbruikbare betaalmethode ontbreekt.',
		);
	}

	const existingCustomerId = getStripeId(pm.customer);
	if (!existingCustomerId) {
		await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
	} else if (existingCustomerId !== customerId) {
		throw new Error('Betaalmethode hoort bij een andere klant');
	}

	await stripe.customers.update(customerId, {
		invoice_settings: { default_payment_method: paymentMethodId },
	});
	await detachDuplicateFingerprintPaymentMethods(stripe, customerId, pm);
}
