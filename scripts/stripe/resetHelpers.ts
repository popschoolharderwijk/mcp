/**
 * Side-effect-free guards and plans for `stripe:reset:customers` / `stripe:reset:catalog`.
 * Sandbox Stripe (`sk_test_…`) only; never production Supabase.
 */

import type { DeployEnv } from '../supabase/envHelpers.ts';

export const STRIPE_RESET_ENV_CLI_USAGE = 'local|development|dev|test';

export const STRIPE_RESET_SCOPES = ['customers', 'catalog'] as const;

export type StripeResetScope = (typeof STRIPE_RESET_SCOPES)[number];

export type StripeResetGuardError =
	| 'missing_stripe_secret'
	| 'live_stripe_secret'
	| 'non_test_stripe_secret'
	| 'production_deploy_env'
	| 'production_supabase_url'
	| 'missing_supabase_url'
	| 'missing_service_role_key';

export type StripeResetGuardResult = { ok: true } | { ok: false; error: StripeResetGuardError; message: string };

export type StripeResetCliParseResult =
	| { ok: true; scope: StripeResetScope; envArgv: string[]; verbLabel: string }
	| { ok: false; message: string };

/** True when the URL points at the production Supabase project. */
export function isProductionSupabaseUrl(supabaseUrl: string, productionProjectRef: string): boolean {
	const trimmed = supabaseUrl.trim().toLowerCase();
	const ref = productionProjectRef.trim().toLowerCase();
	if (!trimmed || !ref) return false;
	return trimmed.includes(ref);
}

export function parseStripeResetScope(arg: string | undefined): StripeResetScope | null {
	if (arg === 'customers' || arg === 'catalog') return arg;
	return null;
}

/** `bun run scripts/stripe/reset.ts <customers|catalog> [local|development|dev|test]` */
export function parseStripeResetCliArgs(argv: string[]): StripeResetCliParseResult {
	const scope = parseStripeResetScope(argv[0]);
	if (!scope) {
		return {
			ok: false,
			message: `Unknown scope "${argv[0] ?? ''}". Usage: bun run stripe:reset:<customers|catalog> [${STRIPE_RESET_ENV_CLI_USAGE}]`,
		};
	}
	return {
		ok: true,
		scope,
		envArgv: argv.slice(1),
		verbLabel: `stripe:reset:${scope}`,
	};
}

export function assertStripeResetAllowed(input: {
	stripeSecretKey: string | undefined;
	deployEnv: DeployEnv;
	supabaseUrl: string | undefined;
	serviceRoleKey: string | undefined;
	productionProjectRef: string;
	verbLabel?: string;
}): StripeResetGuardResult {
	const verb = input.verbLabel ?? 'stripe:reset';
	if (input.deployEnv === 'production') {
		return {
			ok: false,
			error: 'production_deploy_env',
			message: `${verb} refuses production. Use local, development, or test only.`,
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
			message: `${verb} refuses production database (${input.productionProjectRef}).`,
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
			message: `${verb} refuses live Stripe keys (sk_live_…). Sandbox sk_test_… only.`,
		};
	}
	if (!key.startsWith('sk_test_')) {
		return {
			ok: false,
			error: 'non_test_stripe_secret',
			message: `${verb} requires a Stripe test secret key (sk_test_…).`,
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

/** DB patch that marks every option as waiting for a fresh catalog sync. */
export function stripeCatalogStatusResetPatch(): {
	stripe_catalog_status: 'pending';
	stripe_catalog_synced_at: null;
	stripe_catalog_sync_error: null;
} {
	return {
		stripe_catalog_status: 'pending',
		stripe_catalog_synced_at: null,
		stripe_catalog_sync_error: null,
	};
}

export type StripeCustomerPage = {
	data: Array<{ id: string }>;
	has_more: boolean;
};

export type StripeProductListItem = {
	id: string;
	metadata?: Record<string, string> | null;
};

export type StripeProductPage = {
	data: StripeProductListItem[];
	has_more: boolean;
};

export type StripePriceListItem = {
	id: string;
};

export type StripePricePage = {
	data: StripePriceListItem[];
	has_more: boolean;
};

/** Catalog products carry lesson_type_option_id; agreement products use lesson_agreement_id. */
export function isCatalogStripeProduct(product: StripeProductListItem): boolean {
	const optionId = product.metadata?.lesson_type_option_id?.trim();
	return Boolean(optionId);
}

export function catalogStripeProductIds(products: readonly StripeProductListItem[]): string[] {
	return products.filter(isCatalogStripeProduct).map((product) => product.id);
}

export function nextStripeCustomerCursor(page: StripeCustomerPage): string | null {
	if (!page.has_more || page.data.length === 0) return null;
	return page.data[page.data.length - 1]?.id ?? null;
}

export function nextStripeProductCursor(page: StripeProductPage): string | null {
	if (!page.has_more || page.data.length === 0) return null;
	return page.data[page.data.length - 1]?.id ?? null;
}

export function nextStripePriceCursor(page: StripePricePage): string | null {
	if (!page.has_more || page.data.length === 0) return null;
	return page.data[page.data.length - 1]?.id ?? null;
}

export function stripePriceIds(page: StripePricePage): string[] {
	return page.data.map((row) => row.id);
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

export function stripeProductsListResult(
	responseOk: boolean,
	payload: StripeProductPage & StripeErrorPayload,
	status: number,
): StripeApiResult<StripeProductPage> {
	if (!responseOk) {
		return { ok: false, message: `Stripe products.list failed: ${payload.error?.message ?? status}` };
	}
	return {
		ok: true,
		value: { data: payload.data ?? [], has_more: Boolean(payload.has_more) },
	};
}

export function stripePricesListResult(
	responseOk: boolean,
	payload: StripePricePage & StripeErrorPayload,
	status: number,
): StripeApiResult<StripePricePage> {
	if (!responseOk) {
		return { ok: false, message: `Stripe prices.list failed: ${payload.error?.message ?? status}` };
	}
	return {
		ok: true,
		value: { data: payload.data ?? [], has_more: Boolean(payload.has_more) },
	};
}

/** Stripe Prices cannot be deleted via API — only archived with `active: false`. */
export function stripePriceArchiveResult(
	responseOk: boolean,
	payload: { id?: string; active?: boolean } & StripeErrorPayload,
	status: number,
	priceId: string,
): StripeApiResult<true> {
	if (responseOk && payload.active === false) return { ok: true, value: true };
	return {
		ok: false,
		message: `Stripe prices.update ${priceId} (archive) failed: ${payload.error?.message ?? status}`,
	};
}

/**
 * Archive Products with `active=false`. Product DELETE stays blocked while any
 * user-created Prices exist — and Prices have no DELETE API, only archive.
 */
export function stripeProductArchiveResult(
	responseOk: boolean,
	payload: { id?: string; active?: boolean } & StripeErrorPayload,
	status: number,
	productId: string,
): StripeApiResult<true> {
	if (responseOk && payload.active === false) return { ok: true, value: true };
	return {
		ok: false,
		message: `Stripe products.update ${productId} (archive) failed: ${payload.error?.message ?? status}`,
	};
}

export function stripeResetDoneMessage(scope: StripeResetScope): string {
	if (scope === 'customers') {
		return 'Done. Machtigingen / SubscriptionCard should show no Stripe mandates until re-issued.';
	}
	return 'Done. Lesson-type Stripe column should show pending until stripe:sync:catalog runs.';
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
