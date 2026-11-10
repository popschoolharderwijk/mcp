import { beginAuthenticatedPostRequest, jsonResponse } from '../_shared/http.ts';
import { getSafeErrorMessage, getStripe } from '../_shared/stripe.ts';
import { createSupabaseClients, requirePrivilegedUser } from '../_shared/supabase.ts';
import { runReconcileStripeMandates } from './runReconcileStripeMandates.ts';

const UNCONFIGURED_RECONCILE_BODY = {
	configured: false,
	checked: 0,
	synced: 0,
	canceled: 0,
	skipped: 0,
	failed: 0,
} as const;

async function authenticateReconcileRequest(req: Request) {
	const begun = await beginAuthenticatedPostRequest(req);
	if (!begun.ok) return begun;
	const { userClient, admin } = createSupabaseClients(begun.authHeader);
	const authn = await requirePrivilegedUser(userClient);
	if (!authn.ok) return authn;
	return { ok: true as const, admin };
}

async function runConfiguredReconcile(admin: ReturnType<typeof createSupabaseClients>['admin']): Promise<Response> {
	try {
		const summary = await runReconcileStripeMandates(admin, getStripe());
		return jsonResponse(200, { configured: true, ...summary });
	} catch (err) {
		console.error('reconcile-stripe-mandates error', err);
		return jsonResponse(500, { error: getSafeErrorMessage(err, 'Kon machtigingen niet synchroniseren') });
	}
}

export async function handleReconcileStripeMandatesRequest(req: Request): Promise<Response> {
	const auth = await authenticateReconcileRequest(req);
	if (!auth.ok) return auth.response;
	if (!Deno.env.get('STRIPE_SECRET_KEY')) return jsonResponse(200, UNCONFIGURED_RECONCILE_BODY);
	return runConfiguredReconcile(auth.admin);
}
