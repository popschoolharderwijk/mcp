/**
 * Side-effect-free plans for `stripe:setup:webhooks`.
 * Creates/updates a snapshot Event Destination for the MCP stripe-webhook edge function
 * (or documents local Stripe CLI listen). Same env targets as `db:reset`.
 */

import { STRIPE_WEBHOOK_ENABLED_EVENTS } from '../../supabase/functions/_shared/stripeWebhookHandlersHelpers.ts';
import { DEPLOY_ENV_CLI_USAGE, type DeployEnv } from '../supabase/envHelpers.ts';
import { isProductionSupabaseUrl } from './resetHelpers.ts';

export { DEPLOY_ENV_CLI_USAGE as STRIPE_SETUP_WEBHOOKS_ENV_CLI_USAGE };

/** Stable destination name so re-runs update the same destination. */
export const MCP_STRIPE_WEBHOOK_DESTINATION_NAME = 'mcp-stripe-webhook';

/**
 * Stripe-Version header for `/v2/core/event_destinations`.
 * Bump when Stripe requires a newer version for this API.
 */
export const STRIPE_EVENT_DESTINATION_API_VERSION = '2026-03-25.dahlia';

export const STRIPE_WEBHOOK_SETUP_EVENTS: readonly string[] = STRIPE_WEBHOOK_ENABLED_EVENTS;

export type StripeWebhookSetupGuardError =
	| 'missing_supabase_url'
	| 'missing_stripe_secret'
	| 'env_url_mismatch'
	| 'live_stripe_secret'
	| 'non_test_stripe_secret'
	| 'non_live_stripe_secret';

export type StripeWebhookSetupGuardResult =
	| { ok: true }
	| { ok: false; error: StripeWebhookSetupGuardError; message: string };

export type StripeEventDestinationListItem = {
	id: string;
	name?: string | null;
	type?: string | null;
	enabled_events?: string[] | null;
	webhook_endpoint?: { url?: string | null } | null;
};

export type StripeWebhookSetupTarget = { kind: 'destination'; url: string } | { kind: 'local_listen' };

export function buildStripeWebhookEndpointUrl(supabaseUrl: string): string {
	return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/stripe-webhook`;
}

export function isLoopbackSupabaseUrl(supabaseUrl: string): boolean {
	try {
		const host = new URL(supabaseUrl).hostname.toLowerCase();
		return host === '127.0.0.1' || host === 'localhost' || host === '::1';
	} catch {
		return false;
	}
}

/** Local Docker → CLI listen; remotes → Dashboard Event Destination URL (override wins). */
export function resolveStripeWebhookSetupTarget(input: {
	supabaseUrl: string;
	urlOverride?: string;
}): StripeWebhookSetupTarget {
	const override = input.urlOverride?.trim();
	if (override) return { kind: 'destination', url: override.replace(/\/$/, '') };
	if (isLoopbackSupabaseUrl(input.supabaseUrl)) return { kind: 'local_listen' };
	return { kind: 'destination', url: buildStripeWebhookEndpointUrl(input.supabaseUrl) };
}

/**
 * Production expects `sk_live_…` + prod Supabase URL.
 * local/dev/test expect `sk_test_…` and must not point at prod Supabase.
 */
export function assertStripeWebhookSetupAllowed(input: {
	stripeSecretKey: string | undefined;
	deployEnv: DeployEnv;
	supabaseUrl: string | undefined;
	productionProjectRef: string;
}): StripeWebhookSetupGuardResult {
	const supabaseUrl = input.supabaseUrl?.trim();
	if (!supabaseUrl) {
		return {
			ok: false,
			error: 'missing_supabase_url',
			message: 'Missing SUPABASE_URL for the selected environment.',
		};
	}
	const key = input.stripeSecretKey?.trim();
	if (!key) {
		return {
			ok: false,
			error: 'missing_stripe_secret',
			message: 'Missing STRIPE_SECRET_KEY from edge secrets for the selected environment.',
		};
	}

	const isProdEnv = input.deployEnv === 'production';
	const urlIsProd = isProductionSupabaseUrl(supabaseUrl, input.productionProjectRef);
	if (isProdEnv !== urlIsProd) {
		return {
			ok: false,
			error: 'env_url_mismatch',
			message: isProdEnv
				? `stripe:setup:webhooks production requires the production Supabase URL (${input.productionProjectRef}).`
				: `stripe:setup:webhooks ${input.deployEnv} refuses the production Supabase URL (${input.productionProjectRef}).`,
		};
	}

	if (isProdEnv) {
		if (!key.startsWith('sk_live_')) {
			return {
				ok: false,
				error: 'non_live_stripe_secret',
				message: 'stripe:setup:webhooks production requires a live Stripe secret key (sk_live_…).',
			};
		}
		return { ok: true };
	}

	if (key.startsWith('sk_live_')) {
		return {
			ok: false,
			error: 'live_stripe_secret',
			message: `stripe:setup:webhooks ${input.deployEnv} refuses live Stripe keys (sk_live_…). Use sk_test_… for this target.`,
		};
	}
	if (!key.startsWith('sk_test_')) {
		return {
			ok: false,
			error: 'non_test_stripe_secret',
			message: `stripe:setup:webhooks ${input.deployEnv} requires a Stripe test secret key (sk_test_…).`,
		};
	}
	return { ok: true };
}

export function findMcpStripeWebhookDestination(
	destinations: readonly StripeEventDestinationListItem[],
	webhookUrl: string,
): StripeEventDestinationListItem | null {
	const byUrl = destinations.find(
		(destination) => destination.type === 'webhook_endpoint' && destination.webhook_endpoint?.url === webhookUrl,
	);
	if (byUrl) return byUrl;
	const byName = destinations.find(
		(destination) =>
			destination.type === 'webhook_endpoint' && destination.name === MCP_STRIPE_WEBHOOK_DESTINATION_NAME,
	);
	return byName ?? null;
}

export function buildCreateStripeWebhookDestinationBody(webhookUrl: string): Record<string, unknown> {
	return {
		name: MCP_STRIPE_WEBHOOK_DESTINATION_NAME,
		description: 'MCP stripe-webhook edge function (snapshot events)',
		type: 'webhook_endpoint',
		event_payload: 'snapshot',
		events_from: ['@self'],
		enabled_events: [...STRIPE_WEBHOOK_SETUP_EVENTS],
		webhook_endpoint: { url: webhookUrl },
		include: ['webhook_endpoint.signing_secret', 'webhook_endpoint.url'],
	};
}

export function buildUpdateStripeWebhookDestinationBody(webhookUrl: string): Record<string, unknown> {
	return {
		name: MCP_STRIPE_WEBHOOK_DESTINATION_NAME,
		description: 'MCP stripe-webhook edge function (snapshot events)',
		enabled_events: [...STRIPE_WEBHOOK_SETUP_EVENTS],
		webhook_endpoint: { url: webhookUrl },
		include: ['webhook_endpoint.url'],
	};
}

/** Parses `[env…] [--url <https://…>|--url=<https://…>]` like other target scripts. */
export function parseStripeWebhookSetupCliArgs(argv: string[]): {
	envArgv: string[];
	urlOverride?: string;
} {
	const envArgv: string[] = [];
	let urlOverride: string | undefined;
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === '--url') {
			urlOverride = argv[index + 1];
			index += 1;
			continue;
		}
		if (arg.startsWith('--url=')) {
			urlOverride = arg.slice('--url='.length);
			continue;
		}
		envArgv.push(arg);
	}
	return { envArgv, urlOverride };
}

export type StripeApiResult<T> = { ok: true; value: T } | { ok: false; message: string };

type StripeErrorPayload = { error?: { message?: string; code?: string } };

export function stripeEventDestinationListResult(
	responseOk: boolean,
	payload: { data?: StripeEventDestinationListItem[] } & StripeErrorPayload,
	status: number,
): StripeApiResult<StripeEventDestinationListItem[]> {
	if (!responseOk) {
		return {
			ok: false,
			message: `Stripe event_destinations.list failed: ${payload.error?.message ?? status}`,
		};
	}
	return { ok: true, value: payload.data ?? [] };
}

export function stripeEventDestinationMutationResult(
	responseOk: boolean,
	payload: {
		id?: string;
		enabled_events?: string[];
		webhook_endpoint?: { url?: string | null; signing_secret?: string | null };
	} & StripeErrorPayload,
	status: number,
	action: 'create' | 'update',
): StripeApiResult<{
	id: string;
	enabledEvents: string[];
	url: string | null;
	signingSecret: string | null;
}> {
	if (!responseOk || !payload.id) {
		return {
			ok: false,
			message: `Stripe event_destinations.${action} failed: ${payload.error?.message ?? status}`,
		};
	}
	return {
		ok: true,
		value: {
			id: payload.id,
			enabledEvents: payload.enabled_events ?? [],
			url: payload.webhook_endpoint?.url ?? null,
			signingSecret: payload.webhook_endpoint?.signing_secret ?? null,
		},
	};
}

export function stripeWebhookLocalListenDoneMessage(edgeSecretsFile: string): string {
	return [
		'Done. Local Docker has no Dashboard Event Destination — use the Stripe CLI:',
		'  1. stripe login',
		'  2. stripe switch                    # pick the local sandbox (not live)',
		'  3. stripe listen --print-secret     # copy whsec_…',
		`  4. set STRIPE_WEBHOOK_SECRET=whsec_… in ${edgeSecretsFile}`,
		'  5. bun run db:push:secrets && bun run supabase:restart',
		'  6. bun run stripe:webhook           # keep running; forwards to local edge',
		'Optional tunnel destination instead: bun run stripe:setup:webhooks local --url=https://…/functions/v1/stripe-webhook',
	].join('\n');
}

export function stripeWebhookSetupDoneMessage(input: {
	action: 'created' | 'updated';
	edgeSecretsFile: string;
	signingSecret: string | null;
}): string {
	if (input.action === 'updated') {
		return `Done. Destination updated (events refreshed). Existing STRIPE_WEBHOOK_SECRET in ${input.edgeSecretsFile} stays valid.`;
	}
	if (!input.signingSecret) {
		return `Done. Destination created, but Stripe did not return a signing secret. Copy whsec_… from the Dashboard into ${input.edgeSecretsFile}, then bun run db:push:secrets.`;
	}
	return `Done. Destination created. Set STRIPE_WEBHOOK_SECRET=${input.signingSecret} in ${input.edgeSecretsFile}, then bun run db:push:secrets (and supabase:restart for local).`;
}
