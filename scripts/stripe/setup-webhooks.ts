/**
 * Create or update the MCP stripe-webhook Event Destination (same env targets as db:reset).
 *
 *   bun run stripe:setup:webhooks [local|development|dev|test|production|prod]
 *   bun run stripe:setup:webhooks local --url=https://…/functions/v1/stripe-webhook
 *
 * Snapshot payload + `STRIPE_WEBHOOK_ENABLED_EVENTS`.
 * Local Docker (loopback SUPABASE_URL) → Stripe CLI listen instructions (or --url tunnel).
 * Confirmation follows supabase.json (production uses confirmTarget).
 */

import { edgeSecretsEnvFile, PRODUCTION_PROJECT_REF } from '../supabase/envHelpers.ts';
import {
	fail,
	loadRuntimeAndEdgeEnvMap,
	runTargetScriptMain,
	warnIfSecretsPointerMissing,
} from '../supabase/runHelpers.ts';
import {
	assertStripeWebhookSetupAllowed,
	buildCreateStripeWebhookDestinationBody,
	buildUpdateStripeWebhookDestinationBody,
	findMcpStripeWebhookDestination,
	parseStripeWebhookSetupCliArgs,
	resolveStripeWebhookSetupTarget,
	STRIPE_EVENT_DESTINATION_API_VERSION,
	STRIPE_SETUP_WEBHOOKS_ENV_CLI_USAGE,
	STRIPE_WEBHOOK_SETUP_EVENTS,
	type StripeEventDestinationListItem,
	stripeEventDestinationListResult,
	stripeEventDestinationMutationResult,
	stripeWebhookLocalListenDoneMessage,
	stripeWebhookSetupDoneMessage,
} from './webhookSetupHelpers.ts';

const STRIPE_EVENT_DESTINATIONS_API = 'https://api.stripe.com/v2/core/event_destinations';
const VERB_LABEL = 'stripe:setup:webhooks';

function stripeV2Headers(secretKey: string): Record<string, string> {
	return {
		Authorization: `Bearer ${secretKey}`,
		'Stripe-Version': STRIPE_EVENT_DESTINATION_API_VERSION,
		'Content-Type': 'application/json',
	};
}

async function listEventDestinations(secretKey: string): Promise<StripeEventDestinationListItem[]> {
	const url = new URL(STRIPE_EVENT_DESTINATIONS_API);
	url.searchParams.append('include', 'webhook_endpoint.url');
	url.searchParams.set('limit', '100');
	const response = await fetch(url, { headers: stripeV2Headers(secretKey) });
	const payload = (await response.json()) as {
		data?: StripeEventDestinationListItem[];
		error?: { message?: string };
	};
	const result = stripeEventDestinationListResult(response.ok, payload, response.status);
	if (!result.ok) fail(result.message);
	return result.value;
}

type StripeEventDestinationMutationPayload = {
	id?: string;
	enabled_events?: string[];
	webhook_endpoint?: { url?: string | null; signing_secret?: string | null };
	error?: { message?: string };
};

async function mutateEventDestination(secretKey: string, url: string, body: unknown, action: 'create' | 'update') {
	const response = await fetch(url, {
		method: 'POST',
		headers: stripeV2Headers(secretKey),
		body: JSON.stringify(body),
	});
	const payload = (await response.json()) as StripeEventDestinationMutationPayload;
	const result = stripeEventDestinationMutationResult(response.ok, payload, response.status, action);
	if (!result.ok) fail(result.message);
	return result.value;
}

async function createEventDestination(secretKey: string, webhookUrl: string) {
	return mutateEventDestination(
		secretKey,
		STRIPE_EVENT_DESTINATIONS_API,
		buildCreateStripeWebhookDestinationBody(webhookUrl),
		'create',
	);
}

async function updateEventDestination(secretKey: string, destinationId: string, webhookUrl: string) {
	return mutateEventDestination(
		secretKey,
		`${STRIPE_EVENT_DESTINATIONS_API}/${destinationId}`,
		buildUpdateStripeWebhookDestinationBody(webhookUrl),
		'update',
	);
}

async function setupWebhookDestination(input: {
	stripeSecretKey: string;
	webhookUrl: string;
	edgeSecretsFile: string;
}): Promise<string> {
	console.log(`Webhook URL: ${input.webhookUrl}`);
	console.log(`Events (${STRIPE_WEBHOOK_SETUP_EVENTS.length}): ${STRIPE_WEBHOOK_SETUP_EVENTS.join(', ')}`);

	const existing = findMcpStripeWebhookDestination(
		await listEventDestinations(input.stripeSecretKey),
		input.webhookUrl,
	);

	if (existing) {
		console.log(`Updating destination ${existing.id}…`);
		const updated = await updateEventDestination(input.stripeSecretKey, existing.id, input.webhookUrl);
		console.log(`  enabled events: ${updated.enabledEvents.length}`);
		return stripeWebhookSetupDoneMessage({
			action: 'updated',
			edgeSecretsFile: input.edgeSecretsFile,
			signingSecret: null,
		});
	}

	console.log('Creating destination…');
	const created = await createEventDestination(input.stripeSecretKey, input.webhookUrl);
	console.log(`  id: ${created.id}`);
	console.log(`  enabled events: ${created.enabledEvents.length}`);
	return stripeWebhookSetupDoneMessage({
		action: 'created',
		edgeSecretsFile: input.edgeSecretsFile,
		signingSecret: created.signingSecret,
	});
}

async function main(): Promise<void> {
	const parsed = parseStripeWebhookSetupCliArgs(process.argv.slice(2));

	await runTargetScriptMain({
		verbLabel: VERB_LABEL,
		envArgv: parsed.envArgv,
		usageEnvs: STRIPE_SETUP_WEBHOOKS_ENV_CLI_USAGE,
		destructive: false,
		preflight: (target) => {
			warnIfSecretsPointerMissing();
			const env = loadRuntimeAndEdgeEnvMap(target);
			const guard = assertStripeWebhookSetupAllowed({
				stripeSecretKey: env.STRIPE_SECRET_KEY,
				deployEnv: target.env,
				supabaseUrl: env.SUPABASE_URL,
				productionProjectRef: PRODUCTION_PROJECT_REF,
			});
			if (!guard.ok) fail(guard.message);
		},
		run: async (target) => {
			const env = loadRuntimeAndEdgeEnvMap(target);
			const edgeSecretsFile = `$SECRETS_PATH/${edgeSecretsEnvFile(target.env)}`;
			const setupTarget = resolveStripeWebhookSetupTarget({
				supabaseUrl: env.SUPABASE_URL ?? '',
				urlOverride: parsed.urlOverride,
			});

			if (setupTarget.kind === 'local_listen') {
				console.log(stripeWebhookLocalListenDoneMessage(edgeSecretsFile));
				return;
			}

			console.log(
				await setupWebhookDestination({
					stripeSecretKey: env.STRIPE_SECRET_KEY?.trim() ?? '',
					webhookUrl: setupTarget.url,
					edgeSecretsFile,
				}),
			);
		},
	});
}

if (import.meta.main) {
	await main();
}
