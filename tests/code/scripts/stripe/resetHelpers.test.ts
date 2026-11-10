import { describe, expect, it } from 'bun:test';
import {
	assertStripeResetAllowed,
	catalogStripeProductIds,
	isCatalogStripeProduct,
	isProductionSupabaseUrl,
	nextStripeCustomerCursor,
	nextStripePriceCursor,
	nextStripeProductCursor,
	parseStripeResetCliArgs,
	parseStripeResetScope,
	STRIPE_RESET_ENV_CLI_USAGE,
	STRIPE_RESET_LOCAL_DELETES,
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
} from '../../../../scripts/stripe/resetHelpers';
import { DEVELOPMENT_PROJECT_REF, PRODUCTION_PROJECT_REF } from '../../../../scripts/supabase/envHelpers';

describe('stripeResetHelpers', () => {
	it('lists non-production CLI targets only', () => {
		expect(STRIPE_RESET_ENV_CLI_USAGE).toBe('local|development|dev|test');
	});

	it('parses explicit customers and catalog scopes', () => {
		expect(parseStripeResetScope('customers')).toBe('customers');
		expect(parseStripeResetScope('catalog')).toBe('catalog');
		expect(parseStripeResetScope('all')).toBeNull();
		expect(parseStripeResetScope(undefined)).toBeNull();
		expect(parseStripeResetCliArgs(['customers'])).toEqual({
			ok: true,
			scope: 'customers',
			envArgv: [],
			verbLabel: 'stripe:reset:customers',
		});
		expect(parseStripeResetCliArgs(['catalog', 'development'])).toEqual({
			ok: true,
			scope: 'catalog',
			envArgv: ['development'],
			verbLabel: 'stripe:reset:catalog',
		});
		expect(parseStripeResetCliArgs([]).ok).toBe(false);
		expect(parseStripeResetCliArgs(['wipe']).ok).toBe(false);
	});

	it('detects production Supabase URLs by project ref', () => {
		expect(isProductionSupabaseUrl(`https://${PRODUCTION_PROJECT_REF}.supabase.co`, PRODUCTION_PROJECT_REF)).toBe(
			true,
		);
		expect(isProductionSupabaseUrl(`https://${DEVELOPMENT_PROJECT_REF}.supabase.co`, PRODUCTION_PROJECT_REF)).toBe(
			false,
		);
		expect(isProductionSupabaseUrl('http://127.0.0.1:54421', PRODUCTION_PROJECT_REF)).toBe(false);
	});

	it('allows sandbox reset against non-production targets with sk_test keys', () => {
		expect(
			assertStripeResetAllowed({
				stripeSecretKey: 'sk_test_abc',
				deployEnv: 'local',
				supabaseUrl: 'http://127.0.0.1:54421',
				serviceRoleKey: 'service-role',
				productionProjectRef: PRODUCTION_PROJECT_REF,
				verbLabel: 'stripe:reset:customers',
			}),
		).toEqual({ ok: true });
	});

	it('refuses production deploy env, production URL, and live Stripe keys', () => {
		expect(
			assertStripeResetAllowed({
				stripeSecretKey: 'sk_test_abc',
				deployEnv: 'production',
				supabaseUrl: 'http://127.0.0.1:54421',
				serviceRoleKey: 'service-role',
				productionProjectRef: PRODUCTION_PROJECT_REF,
				verbLabel: 'stripe:reset:catalog',
			}),
		).toMatchObject({ ok: false, error: 'production_deploy_env' });
		expect(
			assertStripeResetAllowed({
				stripeSecretKey: 'sk_test_abc',
				deployEnv: 'development',
				supabaseUrl: `https://${PRODUCTION_PROJECT_REF}.supabase.co`,
				serviceRoleKey: 'service-role',
				productionProjectRef: PRODUCTION_PROJECT_REF,
			}),
		).toMatchObject({ ok: false, error: 'production_supabase_url' });
		expect(
			assertStripeResetAllowed({
				stripeSecretKey: 'sk_live_abc',
				deployEnv: 'local',
				supabaseUrl: 'http://127.0.0.1:54421',
				serviceRoleKey: 'service-role',
				productionProjectRef: PRODUCTION_PROJECT_REF,
			}),
		).toMatchObject({ ok: false, error: 'live_stripe_secret' });
		expect(
			assertStripeResetAllowed({
				stripeSecretKey: 'rk_test_abc',
				deployEnv: 'local',
				supabaseUrl: 'http://127.0.0.1:54421',
				serviceRoleKey: 'service-role',
				productionProjectRef: PRODUCTION_PROJECT_REF,
			}),
		).toMatchObject({ ok: false, error: 'non_test_stripe_secret' });
	});

	it('pages Stripe customer ids and lists local delete tables', () => {
		expect(
			stripeCustomerIds({
				data: [{ id: 'cus_1' }, { id: 'cus_2' }],
				has_more: true,
			}),
		).toEqual(['cus_1', 'cus_2']);
		expect(
			nextStripeCustomerCursor({
				data: [{ id: 'cus_1' }, { id: 'cus_2' }],
				has_more: true,
			}),
		).toBe('cus_2');
		expect(nextStripeCustomerCursor({ data: [{ id: 'cus_1' }], has_more: false })).toBeNull();
		expect(STRIPE_RESET_LOCAL_DELETES.map((row) => row.table)).toEqual([
			'subscriptions',
			'stripe_customers',
			'stripe_checkout_invitations',
			'agreement_payment_links',
			'payment_link_requests',
		]);
	});

	it('keeps only catalog products and ignores agreement products', () => {
		expect(
			isCatalogStripeProduct({
				id: 'prod_catalog',
				metadata: { lesson_type_option_id: 'opt-1' },
			}),
		).toBe(true);
		expect(
			isCatalogStripeProduct({
				id: 'prod_agreement',
				metadata: { lesson_agreement_id: 'agr-1' },
			}),
		).toBe(false);
		expect(isCatalogStripeProduct({ id: 'prod_empty', metadata: {} })).toBe(false);
		expect(
			catalogStripeProductIds([
				{ id: 'prod_catalog', metadata: { lesson_type_option_id: 'opt-1' } },
				{ id: 'prod_agreement', metadata: { lesson_agreement_id: 'agr-1' } },
				{ id: 'prod_blank', metadata: { lesson_type_option_id: '  ' } },
			]),
		).toEqual(['prod_catalog']);
		expect(
			nextStripeProductCursor({
				data: [{ id: 'prod_1' }, { id: 'prod_2' }],
				has_more: true,
			}),
		).toBe('prod_2');
		expect(nextStripeProductCursor({ data: [{ id: 'prod_1' }], has_more: false })).toBeNull();
	});

	it('builds the pending catalog status reset patch', () => {
		expect(stripeCatalogStatusResetPatch()).toEqual({
			stripe_catalog_status: 'pending',
			stripe_catalog_synced_at: null,
			stripe_catalog_sync_error: null,
		});
	});

	it('parses Stripe list and delete payloads into ok or fail messages', () => {
		expect(stripeCustomersListResult(true, { data: [{ id: 'cus_1' }], has_more: false }, 200)).toEqual({
			ok: true,
			value: { data: [{ id: 'cus_1' }], has_more: false },
		});
		expect(
			stripeCustomersListResult(
				true,
				{ data: undefined, has_more: 1 } as unknown as { data: Array<{ id: string }>; has_more: boolean },
				200,
			),
		).toEqual({
			ok: true,
			value: { data: [], has_more: true },
		});
		expect(
			stripeCustomersListResult(false, { data: [], has_more: false, error: { message: 'boom' } }, 500),
		).toEqual({
			ok: false,
			message: 'Stripe customers.list failed: boom',
		});
		expect(stripeCustomersListResult(false, { data: [], has_more: false }, 503)).toEqual({
			ok: false,
			message: 'Stripe customers.list failed: 503',
		});
		expect(stripeCustomerDeleteResult(true, { deleted: true }, 200, 'cus_1')).toEqual({ ok: true, value: true });
		expect(stripeCustomerDeleteResult(true, { deleted: false }, 200, 'cus_1')).toEqual({
			ok: false,
			message: 'Stripe customers.delete cus_1 failed: 200',
		});
		expect(stripeCustomerDeleteResult(false, { error: { message: 'gone' } }, 404, 'cus_9')).toEqual({
			ok: false,
			message: 'Stripe customers.delete cus_9 failed: gone',
		});
		expect(
			stripeProductsListResult(
				true,
				{ data: [{ id: 'prod_1', metadata: { lesson_type_option_id: 'opt-1' } }], has_more: false },
				200,
			),
		).toEqual({
			ok: true,
			value: {
				data: [{ id: 'prod_1', metadata: { lesson_type_option_id: 'opt-1' } }],
				has_more: false,
			},
		});
		expect(stripeProductsListResult(false, { data: [], has_more: false, error: { message: 'nope' } }, 500)).toEqual(
			{
				ok: false,
				message: 'Stripe products.list failed: nope',
			},
		);
		expect(stripePricesListResult(true, { data: [{ id: 'price_1' }], has_more: false }, 200)).toEqual({
			ok: true,
			value: { data: [{ id: 'price_1' }], has_more: false },
		});
		expect(stripePricesListResult(false, { data: [], has_more: false, error: { message: 'nope' } }, 500)).toEqual({
			ok: false,
			message: 'Stripe prices.list failed: nope',
		});
		expect(stripePriceArchiveResult(true, { id: 'price_1', active: false }, 200, 'price_1')).toEqual({
			ok: true,
			value: true,
		});
		expect(stripePriceArchiveResult(false, { error: { message: 'used' } }, 400, 'price_2')).toEqual({
			ok: false,
			message: 'Stripe prices.update price_2 (archive) failed: used',
		});
		expect(stripeProductArchiveResult(true, { id: 'prod_1', active: false }, 200, 'prod_1')).toEqual({
			ok: true,
			value: true,
		});
		expect(stripeProductArchiveResult(false, { error: { message: 'busy' } }, 400, 'prod_2')).toEqual({
			ok: false,
			message: 'Stripe products.update prod_2 (archive) failed: busy',
		});
		expect(stripePriceIds({ data: [{ id: 'price_1' }, { id: 'price_2' }], has_more: false })).toEqual([
			'price_1',
			'price_2',
		]);
		expect(nextStripePriceCursor({ data: [{ id: 'price_1' }, { id: 'price_2' }], has_more: true })).toBe('price_2');
		expect(nextStripePriceCursor({ data: [{ id: 'price_1' }], has_more: false })).toBeNull();
	});

	it('trims guarded env credentials for the wipe step', () => {
		expect(
			stripeResetCredentials({
				STRIPE_SECRET_KEY: ' sk_test_abc ',
				SUPABASE_URL: ' https://example.supabase.co ',
				SUPABASE_SERVICE_ROLE_KEY: ' role ',
			}),
		).toEqual({
			stripeSecretKey: 'sk_test_abc',
			supabaseUrl: 'https://example.supabase.co',
			serviceRoleKey: 'role',
		});
		expect(stripeResetCredentials({})).toEqual({
			stripeSecretKey: '',
			supabaseUrl: '',
			serviceRoleKey: '',
		});
	});
});
