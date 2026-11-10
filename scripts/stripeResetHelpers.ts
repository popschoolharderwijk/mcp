/**
 * Side-effect-free guards and plans for `stripe:reset`.
 * Sandbox Stripe (`sk_test_…`) only; never production Supabase.
 */

import type { DeployEnv } from './supabase/envHelpers.ts';

export const STRIPE_RESET_ENV_CLI_USAGE = 'local|development|dev|test';

export type StripeResetGuardError =
	| 'missing_stripe_secret'
	| 'live_stripe_secret'
	| 'non_test_stripe_secret'
	| 'production_deploy_env'
	| 'production_supabase_url'
	| 'missing_supabase_url'
	| 'missing_service_role_key';

export type StripeResetGuardResult = { ok: true } | { ok: false; error: StripeResetGuardError; message: string };

/** True when the URL points at the production Supabase project. */
export function isProductionSupabaseUrl(supabaseUrl: string, productionProjectRef: string): boolean {
	const trimmed = supabaseUrl.trim().toLowerCase();
	const ref = productionProjectRef.trim().toLowerCase();
	if (!trimmed || !ref) return false;
	return trimmed.includes(ref);
}

export function assertStripeResetAllowed(input: {
	stripeSecretKey: string | undefined;
	deployEnv: DeployEnv;
	supabaseUrl: string | undefined;
	serviceRoleKey: string | undefined;
	productionProjectRef: string;
}): StripeResetGuardResult {
	if (input.deployEnv === 'production') {
		return {
			ok: false,
			error: 'production_deploy_env',
			message: 'stripe:reset refuses production. Use local, development, or test only.',
		};
	}
	const supabaseUrl = input.supabaseUrl?.trim();
	if (!supabaseUrl) {
		return {
			ok: false,
			error: 'missing_supabase_url',
			message: 'Missing SUPABASE_URL for the selected environment.',
		};
	}
	if (isProductionSupabaseUrl(supabaseUrl, input.productionProjectRef)) {
		return {
			ok: false,
			error: 'production_supabase_url',
			message: `stripe:reset refuses production database (${input.productionProjectRef}).`,
		};
	}
	if (!input.serviceRoleKey?.trim()) {
		return {
			ok: false,
			error: 'missing_service_role_key',
			message: 'Missing SUPABASE_SERVICE_ROLE_KEY for the selected environment.',
		};
	}
	const key = input.stripeSecretKey?.trim();
	if (!key) {
		return {
			ok: false,
			error: 'missing_stripe_secret',
			message: 'Missing STRIPE_SECRET_KEY (expected sk_test_… from edge secrets).',
		};
	}
	if (key.startsWith('sk_live_')) {
		return {
			ok: false,
			error: 'live_stripe_secret',
			message: 'stripe:reset refuses live Stripe keys (sk_live_…). Sandbox sk_test_… only.',
		};
	}
	if (!key.startsWith('sk_test_')) {
		return {
			ok: false,
			error: 'non_test_stripe_secret',
			message: 'stripe:reset requires a Stripe test secret key (sk_test_…).',
		};
	}
	return { ok: true };
}

/** Local tables cleared so Machtigingen / SubscriptionCard match empty Stripe. */
export const STRIPE_RESET_LOCAL_DELETES = [
	{ table: 'subscriptions', notNullColumn: 'id' },
	{ table: 'stripe_customers', notNullColumn: 'user_id' },
	{ table: 'stripe_checkout_invitations', notNullColumn: 'id' },
	{ table: 'agreement_payment_links', notNullColumn: 'lesson_agreement_id' },
	{ table: 'payment_link_requests', notNullColumn: 'id' },
] as const;

export type StripeCustomerPage = {
	data: Array<{ id: string }>;
	has_more: boolean;
};

export function nextStripeCustomerCursor(page: StripeCustomerPage): string | null {
	if (!page.has_more || page.data.length === 0) return null;
	return page.data[page.data.length - 1]?.id ?? null;
}

export function stripeCustomerIds(page: StripeCustomerPage): string[] {
	return page.data.map((row) => row.id);
}

export type StripeApiResult<T> = { ok: true; value: T } | { ok: false; message: string };

type StripeErrorPayload = { error?: { message?: string } };

export function stripeCustomersListResult(
	responseOk: boolean,
	payload: StripeCustomerPage & StripeErrorPayload,
	status: number,
): StripeApiResult<StripeCustomerPage> {
	if (!responseOk) {
		return { ok: false, message: `Stripe customers.list failed: ${payload.error?.message ?? status}` };
	}
	return {
		ok: true,
		value: { data: payload.data ?? [], has_more: Boolean(payload.has_more) },
	};
}

export function stripeCustomerDeleteResult(
	responseOk: boolean,
	payload: { deleted?: boolean } & StripeErrorPayload,
	status: number,
	customerId: string,
): StripeApiResult<true> {
	if (responseOk && payload.deleted === true) return { ok: true, value: true };
	return {
		ok: false,
		message: `Stripe customers.delete ${customerId} failed: ${payload.error?.message ?? status}`,
	};
}

/** Trimmed credentials after `assertStripeResetAllowed` has already passed. */
export function stripeResetCredentials(env: {
	STRIPE_SECRET_KEY?: string;
	SUPABASE_URL?: string;
	SUPABASE_SERVICE_ROLE_KEY?: string;
}): { stripeSecretKey: string; supabaseUrl: string; serviceRoleKey: string } {
	return {
		stripeSecretKey: env.STRIPE_SECRET_KEY?.trim() ?? '',
		supabaseUrl: env.SUPABASE_URL?.trim() ?? '',
		serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '',
	};
}
