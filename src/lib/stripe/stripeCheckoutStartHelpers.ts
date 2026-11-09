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
};

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
	const { data, error: invokeErr } = await deps.invokeCreateSubscriptionCheckout(
		buildStripeCheckoutInvokeBody(agreementId, mode, checkoutSessionId),
	);
	if (hasInvokeResponseError(data, invokeErr)) {
		const fallback =
			mode === 'complete' ? resolveStripeCompleteFallbackError() : resolveStripeCheckoutFallbackError();
		const message = await deps.getFunctionErrorMessage(data, invokeErr, fallback);
		return { status: 'error', message };
	}

	if (mode === 'complete') {
		return { status: 'success' };
	}

	const url = extractCheckoutRedirectUrl(data);
	if (!url) {
		return { status: 'error', message: resolveMissingCheckoutUrlError() };
	}

	return { status: 'redirect', url };
}
