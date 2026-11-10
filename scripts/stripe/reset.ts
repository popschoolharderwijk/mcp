/**
 * Explicit Stripe sandbox resets (never production).
 *
 *   bun run stripe:reset:customers [local|development|dev|test]
 *   bun run stripe:reset:catalog   [local|development|dev|test]
 *
 * customers — wipe Stripe customers + local billing mirrors (catalog Products/Prices stay).
 * catalog   — archive Prices + Products tagged with lesson_type_option_id + mark options pending
 *             (agreement Products with lesson_agreement_id and customers stay).
 *             Stripe has no Price DELETE API; archived Prices still block Product DELETE.
 *
 * Loads runtime env (SUPABASE_*) and edge secrets (STRIPE_SECRET_KEY) for the target.
 * Confirmation follows `supabase.json` target.confirm (same as `db:reset`).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PRODUCTION_PROJECT_REF } from '../supabase/envHelpers.ts';
import {
	fail,
	loadRuntimeAndEdgeEnvMap,
	runTargetScriptMain,
	warnIfSecretsPointerMissing,
} from '../supabase/runHelpers.ts';
import {
	assertStripeResetAllowed,
	catalogStripeProductIds,
	nextStripePriceCursor,
	nextStripeProductCursor,
	parseStripeResetCliArgs,
	STRIPE_RESET_ENV_CLI_USAGE,
	STRIPE_RESET_LOCAL_DELETES,
	type StripeCustomerPage,
	type StripePricePage,
	type StripeProductPage,
	type StripeResetScope,
	stripeCatalogStatusResetPatch,
	stripeCustomerDeleteResult,
	stripeCustomerIds,
	stripeCustomersListResult,
	stripePriceArchiveResult,
	stripePriceIds,
	stripePricesListResult,
	stripeProductArchiveResult,
	stripeProductsListResult,
	stripeResetCredentials,
	stripeResetDoneMessage,
} from './resetHelpers.ts';

const STRIPE_API = 'https://api.stripe.com/v1';

async function stripeGetCustomers(secretKey: string, startingAfter: string | null): Promise<StripeCustomerPage> {
	const url = new URL(`${STRIPE_API}/customers`);
	url.searchParams.set('limit', '100');
	if (startingAfter) url.searchParams.set('starting_after', startingAfter);
	const response = await fetch(url, {
		headers: { Authorization: `Bearer ${secretKey}` },
	});
	const payload = (await response.json()) as StripeCustomerPage & { error?: { message?: string } };
	const result = stripeCustomersListResult(response.ok, payload, response.status);
	if (!result.ok) fail(result.message);
	return result.value;
}

async function stripeDeleteCustomer(secretKey: string, customerId: string): Promise<void> {
	const response = await fetch(`${STRIPE_API}/customers/${customerId}`, {
		method: 'DELETE',
		headers: { Authorization: `Bearer ${secretKey}` },
	});
	const payload = (await response.json()) as { deleted?: boolean; error?: { message?: string } };
	const result = stripeCustomerDeleteResult(response.ok, payload, response.status, customerId);
	if (!result.ok) fail(result.message);
}

async function deleteAllStripeCustomers(secretKey: string): Promise<number> {
	let deleted = 0;
	// Always re-fetch the first page: deleting while walking `starting_after` skips customers.
	for (;;) {
		const page = await stripeGetCustomers(secretKey, null);
		const ids = stripeCustomerIds(page);
		if (ids.length === 0) break;
		for (const id of ids) {
			await stripeDeleteCustomer(secretKey, id);
			deleted += 1;
			console.log(`  deleted Stripe customer ${id}`);
		}
	}
	return deleted;
}

async function clearLocalBillingMirrors(admin: SupabaseClient): Promise<void> {
	for (const { table, notNullColumn } of STRIPE_RESET_LOCAL_DELETES) {
		const { error } = await admin.from(table).delete().not(notNullColumn, 'is', null);
		if (error) fail(`Failed clearing ${table}: ${error.message}`);
		console.log(`  cleared ${table}`);
	}

	const { error: agreementError } = await admin
		.from('lesson_agreements')
		.update({ stripe_schedule_id: null, minimum_term_end: null })
		.not('id', 'is', null);
	if (agreementError) fail(`Failed clearing lesson_agreements Stripe fields: ${agreementError.message}`);
	console.log('  cleared lesson_agreements.stripe_schedule_id + minimum_term_end');
}

async function wipeCustomersAndLocalMirrors(env: Record<string, string | undefined>): Promise<void> {
	const { stripeSecretKey, supabaseUrl, serviceRoleKey } = stripeResetCredentials(env);
	console.log('Deleting Stripe sandbox customers…');
	const deletedCustomers = await deleteAllStripeCustomers(stripeSecretKey);
	console.log(`Stripe customers deleted: ${deletedCustomers}`);

	console.log('Clearing local billing mirrors…');
	const admin = createClient(supabaseUrl, serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	});
	await clearLocalBillingMirrors(admin);
}

async function stripeGetProducts(
	secretKey: string,
	active: boolean,
	startingAfter: string | null,
): Promise<StripeProductPage> {
	const url = new URL(`${STRIPE_API}/products`);
	url.searchParams.set('limit', '100');
	url.searchParams.set('active', active ? 'true' : 'false');
	if (startingAfter) url.searchParams.set('starting_after', startingAfter);
	const response = await fetch(url, {
		headers: { Authorization: `Bearer ${secretKey}` },
	});
	const payload = (await response.json()) as StripeProductPage & { error?: { message?: string } };
	const result = stripeProductsListResult(response.ok, payload, response.status);
	if (!result.ok) fail(result.message);
	return result.value;
}

async function listActiveCatalogProductIds(secretKey: string): Promise<string[]> {
	const ids = new Set<string>();
	let startingAfter: string | null = null;
	for (;;) {
		const page = await stripeGetProducts(secretKey, true, startingAfter);
		for (const id of catalogStripeProductIds(page.data)) ids.add(id);
		startingAfter = nextStripeProductCursor(page);
		if (!startingAfter) break;
	}
	return [...ids];
}

async function stripeGetActivePrices(
	secretKey: string,
	productId: string,
	startingAfter: string | null,
): Promise<StripePricePage> {
	const url = new URL(`${STRIPE_API}/prices`);
	url.searchParams.set('limit', '100');
	url.searchParams.set('product', productId);
	url.searchParams.set('active', 'true');
	if (startingAfter) url.searchParams.set('starting_after', startingAfter);
	const response = await fetch(url, {
		headers: { Authorization: `Bearer ${secretKey}` },
	});
	const payload = (await response.json()) as StripePricePage & { error?: { message?: string } };
	const result = stripePricesListResult(response.ok, payload, response.status);
	if (!result.ok) fail(result.message);
	return result.value;
}

async function listActivePriceIdsForProduct(secretKey: string, productId: string): Promise<string[]> {
	const ids = new Set<string>();
	let startingAfter: string | null = null;
	for (;;) {
		const page = await stripeGetActivePrices(secretKey, productId, startingAfter);
		for (const id of stripePriceIds(page)) ids.add(id);
		startingAfter = nextStripePriceCursor(page);
		if (!startingAfter) break;
	}
	return [...ids];
}

async function stripeArchivePrice(secretKey: string, priceId: string): Promise<void> {
	const response = await fetch(`${STRIPE_API}/prices/${priceId}`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${secretKey}`,
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: 'active=false',
	});
	const payload = (await response.json()) as { id?: string; active?: boolean; error?: { message?: string } };
	const result = stripePriceArchiveResult(response.ok, payload, response.status, priceId);
	if (!result.ok) fail(result.message);
}

async function stripeArchiveProduct(secretKey: string, productId: string): Promise<void> {
	const response = await fetch(`${STRIPE_API}/products/${productId}`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${secretKey}`,
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: 'active=false',
	});
	const payload = (await response.json()) as { id?: string; active?: boolean; error?: { message?: string } };
	const result = stripeProductArchiveResult(response.ok, payload, response.status, productId);
	if (!result.ok) fail(result.message);
}

/** Prices have no DELETE API; archived Prices still block Product DELETE — archive both. */
async function archiveCatalogProductWithPrices(secretKey: string, productId: string): Promise<void> {
	const priceIds = await listActivePriceIdsForProduct(secretKey, productId);
	for (const priceId of priceIds) {
		await stripeArchivePrice(secretKey, priceId);
		console.log(`  archived Stripe catalog price ${priceId}`);
	}
	await stripeArchiveProduct(secretKey, productId);
}

async function archiveCatalogStripeProducts(secretKey: string): Promise<number> {
	const ids = await listActiveCatalogProductIds(secretKey);
	let archived = 0;
	for (const id of ids) {
		await archiveCatalogProductWithPrices(secretKey, id);
		archived += 1;
		console.log(`  archived Stripe catalog product ${id}`);
	}
	return archived;
}

async function resetLessonTypeOptionCatalogStatus(admin: SupabaseClient): Promise<void> {
	const patch = stripeCatalogStatusResetPatch();
	const { error } = await admin.from('lesson_type_options').update(patch).not('id', 'is', null);
	if (error) fail(`Failed resetting lesson_type_options catalog status: ${error.message}`);
	console.log('  reset lesson_type_options stripe_catalog_* to pending');
}

async function wipeCatalogAndLocalStatus(env: Record<string, string | undefined>): Promise<void> {
	const { stripeSecretKey, supabaseUrl, serviceRoleKey } = stripeResetCredentials(env);
	console.log('Archiving Stripe catalog products (lesson_type_option_id)…');
	const archivedProducts = await archiveCatalogStripeProducts(stripeSecretKey);
	console.log(`Stripe catalog products archived: ${archivedProducts}`);

	console.log('Resetting local catalog status…');
	const admin = createClient(supabaseUrl, serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	});
	await resetLessonTypeOptionCatalogStatus(admin);
}

async function runStripeResetScope(scope: StripeResetScope, env: Record<string, string | undefined>): Promise<void> {
	if (scope === 'customers') {
		await wipeCustomersAndLocalMirrors(env);
		return;
	}
	await wipeCatalogAndLocalStatus(env);
}

async function main(): Promise<void> {
	const parsed = parseStripeResetCliArgs(process.argv.slice(2));
	if (!parsed.ok) fail(parsed.message);

	await runTargetScriptMain({
		verbLabel: parsed.verbLabel,
		envArgv: parsed.envArgv,
		usageEnvs: STRIPE_RESET_ENV_CLI_USAGE,
		refuseEnvs: ['production'],
		destructive: true,
		preflight: (target) => {
			warnIfSecretsPointerMissing();
			const env = loadRuntimeAndEdgeEnvMap(target);
			const guard = assertStripeResetAllowed({
				stripeSecretKey: env.STRIPE_SECRET_KEY,
				deployEnv: target.env,
				supabaseUrl: env.SUPABASE_URL,
				serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
				productionProjectRef: PRODUCTION_PROJECT_REF,
				verbLabel: parsed.verbLabel,
			});
			if (!guard.ok) fail(guard.message);
		},
		run: async (target) => {
			await runStripeResetScope(parsed.scope, loadRuntimeAndEdgeEnvMap(target));
		},
		doneMessage: stripeResetDoneMessage(parsed.scope),
	});
}

if (import.meta.main) {
	await main();
}
