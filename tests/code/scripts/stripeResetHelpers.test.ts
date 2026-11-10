import { describe, expect, it } from 'bun:test';
import {
	assertStripeResetAllowed,
	isProductionSupabaseUrl,
	nextStripeCustomerCursor,
	STRIPE_RESET_ENV_CLI_USAGE,
	STRIPE_RESET_LOCAL_DELETES,
	stripeCustomerDeleteResult,
	stripeCustomerIds,
	stripeCustomersListResult,
	stripeResetCredentials,
} from '../../../scripts/stripeResetHelpers';
import { DEVELOPMENT_PROJECT_REF, PRODUCTION_PROJECT_REF } from '../../../scripts/supabase/envHelpers';

describe('stripeResetHelpers', () => {
	it('lists non-production CLI targets only', () => {
		expect(STRIPE_RESET_ENV_CLI_USAGE).toBe('local|development|dev|test');
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
