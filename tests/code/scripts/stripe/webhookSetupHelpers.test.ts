import { describe, expect, it } from 'bun:test';
import {
	assertStripeWebhookSetupAllowed,
	buildCreateStripeWebhookDestinationBody,
	buildStripeWebhookEndpointUrl,
	buildUpdateStripeWebhookDestinationBody,
	findMcpStripeWebhookDestination,
	isLoopbackSupabaseUrl,
	MCP_STRIPE_WEBHOOK_DESTINATION_NAME,
	parseStripeWebhookSetupCliArgs,
	resolveStripeWebhookSetupTarget,
	STRIPE_SETUP_WEBHOOKS_ENV_CLI_USAGE,
	STRIPE_WEBHOOK_SETUP_EVENTS,
	stripeEventDestinationListResult,
	stripeEventDestinationMutationResult,
} from '../../../../scripts/stripe/webhookSetupHelpers';
import { DEPLOY_ENV_CLI_USAGE, PRODUCTION_PROJECT_REF } from '../../../../scripts/supabase/envHelpers';
import { STRIPE_WEBHOOK_ENABLED_EVENTS } from '../../../../supabase/functions/_shared/stripeWebhookHandlersHelpers';

describe('stripeWebhookSetupHelpers', () => {
	it('uses the same env CLI usage as db:reset', () => {
		expect(STRIPE_SETUP_WEBHOOKS_ENV_CLI_USAGE).toBe(DEPLOY_ENV_CLI_USAGE);
	});

	it('shares the webhook event subscribe list with the edge handler', () => {
		expect(STRIPE_WEBHOOK_SETUP_EVENTS).toEqual([...STRIPE_WEBHOOK_ENABLED_EVENTS]);
	});

	it('builds the edge webhook URL and detects loopback hosts', () => {
		expect(buildStripeWebhookEndpointUrl('https://abc.supabase.co/')).toBe(
			'https://abc.supabase.co/functions/v1/stripe-webhook',
		);
		expect(isLoopbackSupabaseUrl('http://127.0.0.1:54421')).toBe(true);
		expect(isLoopbackSupabaseUrl('http://localhost:54421')).toBe(true);
		expect(isLoopbackSupabaseUrl('https://abc.supabase.co')).toBe(false);
	});

	it('resolves local listen vs remote destination targets', () => {
		expect(
			resolveStripeWebhookSetupTarget({
				supabaseUrl: 'http://127.0.0.1:54421',
			}),
		).toEqual({ kind: 'local_listen' });
		expect(
			resolveStripeWebhookSetupTarget({
				supabaseUrl: 'http://127.0.0.1:54421',
				urlOverride: 'https://abc.supabase.co/functions/v1/stripe-webhook',
			}),
		).toEqual({
			kind: 'destination',
			url: 'https://abc.supabase.co/functions/v1/stripe-webhook',
		});
		expect(
			resolveStripeWebhookSetupTarget({
				supabaseUrl: 'https://abc.supabase.co',
			}),
		).toEqual({
			kind: 'destination',
			url: 'https://abc.supabase.co/functions/v1/stripe-webhook',
		});
	});

	it('allows matching env/url/key pairs for sandbox and production', () => {
		expect(
			assertStripeWebhookSetupAllowed({
				stripeSecretKey: 'sk_test_abc',
				deployEnv: 'development',
				supabaseUrl: 'https://dev.supabase.co',
				productionProjectRef: PRODUCTION_PROJECT_REF,
			}),
		).toEqual({ ok: true });
		expect(
			assertStripeWebhookSetupAllowed({
				stripeSecretKey: 'sk_live_abc',
				deployEnv: 'production',
				supabaseUrl: `https://${PRODUCTION_PROJECT_REF}.supabase.co`,
				productionProjectRef: PRODUCTION_PROJECT_REF,
			}),
		).toEqual({ ok: true });
	});

	it('refuses env/url mismatches and wrong key kinds', () => {
		expect(
			assertStripeWebhookSetupAllowed({
				stripeSecretKey: 'sk_test_abc',
				deployEnv: 'production',
				supabaseUrl: `https://${PRODUCTION_PROJECT_REF}.supabase.co`,
				productionProjectRef: PRODUCTION_PROJECT_REF,
			}),
		).toMatchObject({ ok: false, error: 'non_live_stripe_secret' });
		expect(
			assertStripeWebhookSetupAllowed({
				stripeSecretKey: 'sk_live_abc',
				deployEnv: 'test',
				supabaseUrl: 'https://test.supabase.co',
				productionProjectRef: PRODUCTION_PROJECT_REF,
			}),
		).toMatchObject({ ok: false, error: 'live_stripe_secret' });
		expect(
			assertStripeWebhookSetupAllowed({
				stripeSecretKey: 'sk_test_abc',
				deployEnv: 'development',
				supabaseUrl: `https://${PRODUCTION_PROJECT_REF}.supabase.co`,
				productionProjectRef: PRODUCTION_PROJECT_REF,
			}),
		).toMatchObject({ ok: false, error: 'env_url_mismatch' });
		expect(
			assertStripeWebhookSetupAllowed({
				stripeSecretKey: 'sk_live_abc',
				deployEnv: 'production',
				supabaseUrl: 'https://dev.supabase.co',
				productionProjectRef: PRODUCTION_PROJECT_REF,
			}),
		).toMatchObject({ ok: false, error: 'env_url_mismatch' });
	});

	it('finds an existing destination by webhook URL, then by stable name', () => {
		const url = 'https://abc.supabase.co/functions/v1/stripe-webhook';
		expect(
			findMcpStripeWebhookDestination(
				[
					{
						id: 'ed_other',
						type: 'webhook_endpoint',
						name: 'other',
						webhook_endpoint: { url: 'https://other.example/hook' },
					},
					{
						id: 'ed_match',
						type: 'webhook_endpoint',
						name: 'custom',
						webhook_endpoint: { url },
					},
				],
				url,
			)?.id,
		).toBe('ed_match');
		expect(
			findMcpStripeWebhookDestination(
				[
					{
						id: 'ed_named',
						type: 'webhook_endpoint',
						name: MCP_STRIPE_WEBHOOK_DESTINATION_NAME,
						webhook_endpoint: { url: 'https://old.example/hook' },
					},
				],
				url,
			)?.id,
		).toBe('ed_named');
		expect(findMcpStripeWebhookDestination([], url)).toBeNull();
	});

	it('builds create and update destination bodies with snapshot events', () => {
		const url = 'https://abc.supabase.co/functions/v1/stripe-webhook';
		expect(buildCreateStripeWebhookDestinationBody(url)).toEqual({
			name: MCP_STRIPE_WEBHOOK_DESTINATION_NAME,
			description: 'MCP stripe-webhook edge function (snapshot events)',
			type: 'webhook_endpoint',
			event_payload: 'snapshot',
			events_from: ['@self'],
			enabled_events: [...STRIPE_WEBHOOK_SETUP_EVENTS],
			webhook_endpoint: { url },
			include: ['webhook_endpoint.signing_secret', 'webhook_endpoint.url'],
		});
		expect(buildUpdateStripeWebhookDestinationBody(url)).toEqual({
			name: MCP_STRIPE_WEBHOOK_DESTINATION_NAME,
			description: 'MCP stripe-webhook edge function (snapshot events)',
			enabled_events: [...STRIPE_WEBHOOK_SETUP_EVENTS],
			webhook_endpoint: { url },
			include: ['webhook_endpoint.url'],
		});
	});

	it('parses env args and optional --url flags', () => {
		expect(parseStripeWebhookSetupCliArgs(['production'])).toEqual({
			envArgv: ['production'],
			urlOverride: undefined,
		});
		expect(parseStripeWebhookSetupCliArgs(['test', '--url=https://example/hook'])).toEqual({
			envArgv: ['test'],
			urlOverride: 'https://example/hook',
		});
		expect(parseStripeWebhookSetupCliArgs(['--url', 'https://example/hook', 'development'])).toEqual({
			envArgv: ['development'],
			urlOverride: 'https://example/hook',
		});
	});

	it('parses list and mutation API payloads', () => {
		expect(
			stripeEventDestinationListResult(true, { data: [{ id: 'ed_1', type: 'webhook_endpoint' }] }, 200),
		).toEqual({
			ok: true,
			value: [{ id: 'ed_1', type: 'webhook_endpoint' }],
		});
		expect(stripeEventDestinationListResult(false, { error: { message: 'boom' } }, 500)).toEqual({
			ok: false,
			message: 'Stripe event_destinations.list failed: boom',
		});
		expect(
			stripeEventDestinationMutationResult(
				true,
				{
					id: 'ed_1',
					enabled_events: ['checkout.session.completed'],
					webhook_endpoint: { url: 'https://example/hook', signing_secret: 'whsec_abc' },
				},
				200,
				'create',
			),
		).toEqual({
			ok: true,
			value: {
				id: 'ed_1',
				enabledEvents: ['checkout.session.completed'],
				url: 'https://example/hook',
				signingSecret: 'whsec_abc',
			},
		});
		expect(stripeEventDestinationMutationResult(false, { error: { message: 'nope' } }, 400, 'update')).toEqual({
			ok: false,
			message: 'Stripe event_destinations.update failed: nope',
		});
	});
});
