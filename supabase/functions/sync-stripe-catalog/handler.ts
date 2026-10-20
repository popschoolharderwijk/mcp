import { beginAuthenticatedPostRequest, jsonResponse } from '../_shared/http.ts';
import { getSafeErrorMessage, getStripe } from '../_shared/stripe.ts';
import { createSupabaseClients, requireAdminUser } from '../_shared/supabase.ts';
import { runCatalogSync } from '../_shared/stripeCatalog.ts';
import { type SyncCatalogBody, stripeNotConfiguredResponse, validateSyncCatalogBody } from './validation.ts';

export async function handleSyncStripeCatalogRequest(req: Request): Promise<Response> {
	const begun = await beginAuthenticatedPostRequest<SyncCatalogBody>(req);
	if (!begun.ok) return begun.response;

	const invalid = validateSyncCatalogBody(begun.body);
	if (invalid) return invalid;

	const { userClient, admin } = createSupabaseClients(begun.authHeader);
	const authn = await requireAdminUser(userClient);
	if (!authn.ok) return authn.response;

	if (!Deno.env.get('STRIPE_SECRET_KEY')) return stripeNotConfiguredResponse();

	try {
		const results = await runCatalogSync(admin, getStripe(), begun.body.lesson_type_id);
		return jsonResponse(200, { configured: true, results });
	} catch (err) {
		console.error('sync-stripe-catalog error', err);
		return jsonResponse(500, { error: getSafeErrorMessage(err, 'Synchronisatie met Stripe mislukt') });
	}
}
