// Daily task (pg_cron): first-month invoices on the start date, schedule rebuilds after
// source changes and horizon extension. Protected with the CRON_SECRET header.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getSafeErrorMessage } from '../_shared/errors.ts';
import { handleCorsPreflight, jsonResponse } from '../_shared/http.ts';
import { getStripe } from '../_shared/stripe.ts';
import { issueDueFirstInvoices, processPendingRebuilds, todayIso } from '../_shared/subscriptionSchedule.ts';
import { isValidCronSecret } from './authPure.ts';

Deno.serve(async (req) => {
	const preflight = handleCorsPreflight(req);
	if (preflight) return preflight;
	if (!isValidCronSecret(req.headers.get('x-cron-secret'), Deno.env.get('CRON_SECRET'))) {
		return jsonResponse(401, { error: 'Unauthorized' });
	}
	if (!Deno.env.get('STRIPE_SECRET_KEY')) return jsonResponse(200, { configured: false });

	const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
		auth: { autoRefreshToken: false, persistSession: false },
	});
	try {
		const stripe = getStripe();
		const today = todayIso();
		const firstInvoices = await issueDueFirstInvoices(admin, stripe, today);
		const rebuilds = await processPendingRebuilds(admin, stripe, { today, includeHorizon: true });
		return jsonResponse(200, { configured: true, today, firstInvoices, rebuilds });
	} catch (err) {
		console.error('stripe-billing-daily error', err);
		return jsonResponse(500, { error: getSafeErrorMessage(err, 'Dagelijkse taak mislukt') });
	}
});
