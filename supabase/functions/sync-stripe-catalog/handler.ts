import { rebuildScheduleForAgreement } from '../_shared/billing.ts';
import { beginAuthenticatedPostRequest, jsonResponse } from '../_shared/http.ts';
import { getSafeErrorMessage, getStripe } from '../_shared/stripe.ts';
import { listAgreementsNeedingRebuild, runCatalogSync } from '../_shared/stripeCatalog.ts';
import { summarizeCatalogSyncResults } from '../_shared/stripeCatalogHelpers.ts';
import { createSupabaseClients, requireAdminUser } from '../_shared/supabase.ts';
import {
	pickLessonTypeIdForRebuild,
	type SyncCatalogBody,
	shouldRebuildAfterCatalogSync,
	stripeNotConfiguredResponse,
	validateSyncCatalogBody,
} from './validation.ts';

function isServiceRoleAuth(authHeader: string): boolean {
	const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
	return Boolean(key) && authHeader === `Bearer ${key}`;
}

async function resolveLessonTypeIdForRebuild(
	admin: ReturnType<typeof createSupabaseClients>['admin'],
	body: SyncCatalogBody,
): Promise<string | null> {
	if (body.lesson_type_id) return body.lesson_type_id;
	if (!body.lesson_type_option_id) return null;
	const { data } = await admin
		.from('lesson_type_options')
		.select('lesson_type_id')
		.eq('id', body.lesson_type_option_id)
		.maybeSingle();
	return pickLessonTypeIdForRebuild(body, data?.lesson_type_id as string | undefined);
}

async function rebuildAffectedSchedules(
	admin: ReturnType<typeof createSupabaseClients>['admin'],
	stripe: ReturnType<typeof getStripe>,
	lessonTypeId: string,
) {
	const agreementIds = await listAgreementsNeedingRebuild(admin, lessonTypeId);
	const results: Array<{ lesson_agreement_id: string; ok: boolean; detail?: unknown; error?: string }> = [];
	for (const id of agreementIds) {
		try {
			results.push({
				lesson_agreement_id: id,
				ok: true,
				detail: await rebuildScheduleForAgreement(admin, stripe, id),
			});
		} catch (err) {
			results.push({
				lesson_agreement_id: id,
				ok: false,
				error: getSafeErrorMessage(err, 'rebuild faalde'),
			});
		}
	}
	return results;
}

async function authorizeSyncRequest(authHeader: string) {
	const { userClient, admin } = createSupabaseClients(authHeader);
	if (isServiceRoleAuth(authHeader)) return { ok: true as const, admin };
	const authn = await requireAdminUser(userClient);
	if (!authn.ok) return authn;
	return { ok: true as const, admin };
}

async function runCatalogSyncWithOptionalRebuild(
	admin: ReturnType<typeof createSupabaseClients>['admin'],
	body: SyncCatalogBody,
) {
	const stripe = getStripe();
	const results = await runCatalogSync(admin, stripe, {
		lesson_type_id: body.lesson_type_id,
		lesson_type_option_id: body.lesson_type_option_id,
	});
	let rebuilds: Awaited<ReturnType<typeof rebuildAffectedSchedules>> = [];
	if (shouldRebuildAfterCatalogSync(body)) {
		const lessonTypeId = await resolveLessonTypeIdForRebuild(admin, body);
		if (lessonTypeId) rebuilds = await rebuildAffectedSchedules(admin, stripe, lessonTypeId);
	}
	return { results, rebuilds };
}

async function syncCatalogOrError(
	admin: ReturnType<typeof createSupabaseClients>['admin'],
	body: SyncCatalogBody,
): Promise<Response> {
	try {
		const { results, rebuilds } = await runCatalogSyncWithOptionalRebuild(admin, body);
		return jsonResponse(200, {
			configured: true,
			summary: summarizeCatalogSyncResults(results),
			results,
			rebuilds,
		});
	} catch (err) {
		console.error('sync-stripe-catalog error', err);
		return jsonResponse(500, { error: getSafeErrorMessage(err, 'Synchronisatie met Stripe mislukt') });
	}
}

function requireStripeForSync(
	admin: ReturnType<typeof createSupabaseClients>['admin'],
	body: SyncCatalogBody,
): { ok: false; response: Response } | { ok: true; admin: typeof admin; body: SyncCatalogBody } {
	if (!Deno.env.get('STRIPE_SECRET_KEY')) return { ok: false, response: stripeNotConfiguredResponse() };
	return { ok: true, admin, body };
}

async function authorizeValidatedCatalogSync(
	begun: Extract<Awaited<ReturnType<typeof beginAuthenticatedPostRequest<SyncCatalogBody>>>, { ok: true }>,
) {
	const invalid = validateSyncCatalogBody(begun.body);
	if (invalid) return { ok: false as const, response: invalid };
	const auth = await authorizeSyncRequest(begun.authHeader);
	if (!auth.ok) return auth;
	return requireStripeForSync(auth.admin, begun.body);
}

async function beginAuthorizedCatalogSync(req: Request) {
	const begun = await beginAuthenticatedPostRequest<SyncCatalogBody>(req);
	if (!begun.ok) return begun;
	return authorizeValidatedCatalogSync(begun);
}

export async function handleSyncStripeCatalogRequest(req: Request): Promise<Response> {
	const ready = await beginAuthorizedCatalogSync(req);
	if (!ready.ok) return ready.response;
	return syncCatalogOrError(ready.admin, ready.body);
}
