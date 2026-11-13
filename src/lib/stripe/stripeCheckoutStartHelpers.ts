type StripeCheckoutStartParams = {
	agreementId: string | null;
	checkoutSessionId: string | null;
};

type StripeCheckoutMode = 'complete' | 'checkout';

export type StripeCheckoutStartFlowResult =
	| { status: 'error'; message: string }
	| { status: 'success' }
	| { status: 'redirect'; url: string };

export type StripeCheckoutStartFlowDeps = {
	readMagicLinkUrlError: () => string | null;
	consumeMagicLinkFromUrl: () => Promise<{ ok: boolean; error?: string }>;
	getSession: () => Promise<{ session: unknown | null }>;
	invokeCreateSubscriptionCheckout: (body: Record<string, string>) => Promise<{ data: unknown; error: unknown }>;
	getFunctionErrorMessage: (data: unknown, error: unknown, fallback: string) => Promise<string>;
	sleep?: (ms: number) => Promise<void>;
	pollIntervalMs?: number;
	maxPollAttempts?: number;
};

const CHECKOUT_COMPLETE_POLL_INTERVAL_MS = 1000;
const CHECKOUT_COMPLETE_MAX_ATTEMPTS = 45;

function parseStripeCheckoutStartParams(params: URLSearchParams): StripeCheckoutStartParams {
	return {
		agreementId: params.get('agreement'),
		checkoutSessionId: params.get('session_id'),
	};
}

function resolveMissingAgreementError(): string {
	return 'Ongeldige uitnodigingslink (overeenkomst ontbreekt).';
}

function resolveMissingSessionError(): string {
	return 'Geen actieve sessie. Open de link uit de mail opnieuw.';
}

function resolveMissingCheckoutUrlError(): string {
	return 'Geen checkout-URL ontvangen.';
}

function resolveStripeCheckoutMode(checkoutSessionId: string | null): StripeCheckoutMode {
	return checkoutSessionId ? 'complete' : 'checkout';
}

function buildStripeCheckoutInvokeBody(
	agreementId: string,
	mode: StripeCheckoutMode,
	checkoutSessionId: string | null,
): Record<string, string> {
	if (mode === 'complete') {
		return {
			lesson_agreement_id: agreementId,
			mode: 'complete',
			checkout_session_id: checkoutSessionId ?? '',
		};
	}
	return { lesson_agreement_id: agreementId, mode: 'checkout' };
}

function extractCheckoutRedirectUrl(data: unknown): string | null {
	const url = (data as { url?: string } | null)?.url;
	return url ?? null;
}

function hasInvokeResponseError(data: unknown, error: unknown): boolean {
	const dataError = typeof data === 'object' && data !== null && 'error' in data ? data.error : null;
	return Boolean(error) || typeof dataError === 'string';
}

function resolveStripeCompleteFallbackError(): string {
	return 'Kon betaling niet afronden.';
}

function resolveStripeCheckoutFallbackError(): string {
	return 'Kon betaling niet starten.';
}

/** JSON body from create-subscription-checkout `mode: complete` (not a Stripe object). */
type CheckoutCompletePollPayload = {
	mode?: string;
	pending?: boolean;
	schedule_id?: string;
	subscription_id?: string | null;
};

function isCheckoutCompletePollPayload(data: unknown): data is CheckoutCompletePollPayload {
	return typeof data === 'object' && data !== null;
}

export function resolveCheckoutCompletePollStatus(data: unknown): 'success' | 'pending' | 'invalid' {
	if (!isCheckoutCompletePollPayload(data)) return 'invalid';
	if (typeof data.schedule_id === 'string' && data.schedule_id.length > 0) return 'success';
	if (data.pending === true) return 'pending';
	return 'invalid';
}

function resolveCheckoutCompleteTimeoutMessage(): string {
	return 'Je betaling is ontvangen, maar de machtiging is nog niet zichtbaar. Vernieuw de pagina over een moment, of neem contact op met de school.';
}

async function defaultSleep(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollCheckoutCompleteUntilArranged(
	agreementId: string,
	checkoutSessionId: string,
	deps: StripeCheckoutStartFlowDeps,
): Promise<StripeCheckoutStartFlowResult> {
	const sleep = deps.sleep ?? defaultSleep;
	const intervalMs = deps.pollIntervalMs ?? CHECKOUT_COMPLETE_POLL_INTERVAL_MS;
	const maxAttempts = deps.maxPollAttempts ?? CHECKOUT_COMPLETE_MAX_ATTEMPTS;
	const body = buildStripeCheckoutInvokeBody(agreementId, 'complete', checkoutSessionId);

	for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
		const { data, error: invokeErr } = await deps.invokeCreateSubscriptionCheckout(body);
		if (hasInvokeResponseError(data, invokeErr)) {
			const message = await deps.getFunctionErrorMessage(data, invokeErr, resolveStripeCompleteFallbackError());
			return { status: 'error', message };
		}
		const status = resolveCheckoutCompletePollStatus(data);
		if (status === 'success') return { status: 'success' };
		if (status === 'invalid') {
			return { status: 'error', message: resolveStripeCompleteFallbackError() };
		}
		if (attempt + 1 < maxAttempts) await sleep(intervalMs);
	}

	return { status: 'error', message: resolveCheckoutCompleteTimeoutMessage() };
}

export async function runStripeCheckoutStartFlow(
	params: URLSearchParams,
	deps: StripeCheckoutStartFlowDeps,
): Promise<StripeCheckoutStartFlowResult> {
	const { agreementId, checkoutSessionId } = parseStripeCheckoutStartParams(params);
	if (!agreementId) {
		return { status: 'error', message: resolveMissingAgreementError() };
	}

	const hashError = deps.readMagicLinkUrlError();
	if (hashError) {
		return { status: 'error', message: hashError };
	}

	const linkResult = await deps.consumeMagicLinkFromUrl();
	if (!linkResult.ok) {
		return { status: 'error', message: linkResult.error ?? 'Inloggen mislukt.' };
	}

	const sessionResult = await deps.getSession();
	if (!sessionResult.session) {
		return { status: 'error', message: resolveMissingSessionError() };
	}

	const mode = resolveStripeCheckoutMode(checkoutSessionId);
	if (mode === 'complete') {
		return pollCheckoutCompleteUntilArranged(agreementId, checkoutSessionId as string, deps);
	}

	const { data, error: invokeErr } = await deps.invokeCreateSubscriptionCheckout(
		buildStripeCheckoutInvokeBody(agreementId, mode, checkoutSessionId),
	);
	if (hasInvokeResponseError(data, invokeErr)) {
		const message = await deps.getFunctionErrorMessage(data, invokeErr, resolveStripeCheckoutFallbackError());
		return { status: 'error', message };
	}

	const url = extractCheckoutRedirectUrl(data);
	if (!url) {
		return { status: 'error', message: resolveMissingCheckoutUrlError() };
	}

	return { status: 'redirect', url };
}
