import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type Stripe from 'npm:stripe@17.5.0';
import { getSafeErrorMessage } from '../_shared/errors.ts';
import { beginAuthenticatedPostRequest, jsonResponse } from '../_shared/http.ts';
import { getStripe } from '../_shared/stripe.ts';
import { compareUpcomingAmount, monthStart } from '../_shared/subscriptionPlanPure.ts';
import { loadFeeMonths } from '../_shared/subscriptionSchedule.ts';
import { createSupabaseClients, requireAdminUser } from '../_shared/supabase.ts';

interface Row {
	lesson_agreement_id: string;
	stripe_customer_id: string;
	stripe_subscription_id: string | null;
	status: string;
}

async function checkOne(admin: SupabaseClient, stripe: Stripe, row: Row) {
	if (!row.stripe_subscription_id) {
		return { lesson_agreement_id: row.lesson_agreement_id, status: 'not_started' as const, diff_cents: 0 };
	}
	const upcoming = await stripe.invoices.retrieveUpcoming({
		customer: row.stripe_customer_id,
		subscription: row.stripe_subscription_id,
	});
	const periodStart = upcoming.lines.data[0]?.period?.start ?? upcoming.period_end;
	const month = monthStart(new Date(periodStart * 1000).toISOString().slice(0, 10));
	const [fee] = await loadFeeMonths(admin, row.lesson_agreement_id, month, 1);
	const expected = fee?.amount_cents ?? 0;
	const result = compareUpcomingAmount({
		lesson_agreement_id: row.lesson_agreement_id,
		month,
		expected_cents: expected,
		stripe_cents: upcoming.total,
	});
	await admin
		.from('subscriptions')
		.update({
			last_check_at: new Date().toISOString(),
			last_check_month: month,
			last_check_expected_cents: expected,
			last_check_stripe_cents: upcoming.total,
		})
		.eq('stripe_subscription_id', row.stripe_subscription_id);
	return { lesson_agreement_id: row.lesson_agreement_id, month, expected_cents: expected, stripe_cents: upcoming.total, ...result };
}

export async function handleCheckStripeSubscriptionsRequest(req: Request): Promise<Response> {
	const begun = await beginAuthenticatedPostRequest<Record<string, never>>(req);
	if (!begun.ok) return begun.response;
	const { userClient, admin } = createSupabaseClients(begun.authHeader);
	const authn = await requireAdminUser(userClient);
	if (!authn.ok) return authn.response;
	if (!Deno.env.get('STRIPE_SECRET_KEY')) {
		return jsonResponse(200, { configured: false, message: 'Stripe is nog niet ingesteld', results: [] });
	}

	const stripe = getStripe();
	const { data: rows, error } = await admin
		.from('subscriptions')
		.select('lesson_agreement_id, stripe_customer_id, stripe_subscription_id, status, lesson_agreements!inner(payment_method, is_active)')
		.eq('lesson_agreements.payment_method', 'stripe')
		.eq('lesson_agreements.is_active', true)
		.in('status', ['scheduled', 'trialing', 'active', 'past_due', 'unpaid']);
	if (error) return jsonResponse(500, { error: 'Kon abonnementen niet laden' });

	const results = [];
	for (const row of (rows ?? []) as Row[]) {
		try {
			results.push(await checkOne(admin, stripe, row));
		} catch (err) {
			results.push({
				lesson_agreement_id: row.lesson_agreement_id,
				status: 'error' as const,
				diff_cents: 0,
				error: getSafeErrorMessage(err, 'Controle mislukt'),
			});
		}
	}
	return jsonResponse(200, { configured: true, results });
}
