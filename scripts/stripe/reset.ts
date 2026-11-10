/**
 * Wipe Stripe sandbox customers + local billing mirrors (never production).
 *
 *   bun run stripe:reset:customers [local|development|dev|test]
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
	STRIPE_RESET_ENV_CLI_USAGE,
	STRIPE_RESET_LOCAL_DELETES,
	type StripeCustomerPage,
	stripeCustomerDeleteResult,
	stripeCustomerIds,
	stripeCustomersListResult,
	stripeResetCredentials,
} from './resetHelpers.ts';

const STRIPE_API = 'https://api.stripe.com/v1';
const VERB_LABEL = 'stripe:reset:customers';

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

async function main(): Promise<void> {
	await runTargetScriptMain({
		verbLabel: VERB_LABEL,
		envArgv: process.argv.slice(2),
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
				verbLabel: VERB_LABEL,
			});
			if (!guard.ok) fail(guard.message);
		},
		run: async (target) => {
			await wipeCustomersAndLocalMirrors(loadRuntimeAndEdgeEnvMap(target));
		},
		doneMessage: 'Done. Machtigingen / SubscriptionCard should show no Stripe mandates until re-issued.',
	});
}

if (import.meta.main) {
	await main();
}
