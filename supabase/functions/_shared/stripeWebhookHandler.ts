import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type Stripe from 'npm:stripe@17.5.0';
import { jsonResponse } from './http.ts';
import { getSafeErrorMessage, getStripe } from './stripe.ts';
import { handleStripeWebhookEvent } from './stripe-webhook-handlers.ts';
import { readStripeWebhookEnv, validateStripeWebhookRequest } from './stripeWebhookRequestHelpers.ts';

export async function executeStripeWebhook(req: Request): Promise<Response> {
	const signature = req.headers.get('stripe-signature');
	const env = readStripeWebhookEnv((key) => Deno.env.get(key));
	const validated = validateStripeWebhookRequest(signature, env.webhookSecret);
	if (!validated.ok) return jsonResponse(validated.status, { error: validated.error });

	const admin = createClient(env.supabaseUrl, env.serviceKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	});

	const stripe = getStripe();
	const rawBody = await req.text();

	let event: Stripe.Event;
	try {
		event = await stripe.webhooks.constructEventAsync(rawBody, signature as string, env.webhookSecret as string);
	} catch (err) {
		console.error('signature verification failed', err);
		return jsonResponse(400, { error: `Webhook Error: ${getSafeErrorMessage(err, 'invalid signature')}` });
	}

	try {
		await handleStripeWebhookEvent(admin, stripe, event);
		return jsonResponse(200, { received: true });
	} catch (err) {
		console.error('webhook handler error', err);
		return jsonResponse(500, { error: getSafeErrorMessage(err, 'Webhook handler failed') });
	}
}
