type DirectDebitStartParams = {
	agreementId: string | null;
	checkoutSessionId: string | null;
};

type DirectDebitCheckoutMode = 'complete' | 'checkout';

export type DirectDebitStartFlowResult =
	| { status: 'error'; message: string }
	| { status: 'success' }
	| { status: 'redirect'; url: string };

export type DirectDebitStartFlowDeps = {
	readMagicLinkUrlError: () => string | null;
	consumeMagicLinkFromUrl: () => Promise<{ ok: boolean; error?: string }>;
	getSession: () => Promise<{ session: unknown | null }>;
	invokeCreateSubscriptionCheckout: (body: Record<string, string>) => Promise<{ data: unknown; error: unknown }>;
	getFunctionErrorMessage: (data: unknown, error: unknown, fallback: string) => Promise<string>;
};

function parseDirectDebitStartParams(params: URLSearchParams): DirectDebitStartParams {
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

function resolveDirectDebitCheckoutMode(checkoutSessionId: string | null): DirectDebitCheckoutMode {
	return checkoutSessionId ? 'complete' : 'checkout';
}

function buildDirectDebitCheckoutInvokeBody(
	agreementId: string,
	mode: DirectDebitCheckoutMode,
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

function resolveDirectDebitCompleteFallbackError(): string {
	return 'Kon incasso niet afronden.';
}

function resolveDirectDebitCheckoutFallbackError(): string {
	return 'Kon incasso niet starten.';
}

export async function runDirectDebitStartFlow(
	params: URLSearchParams,
	deps: DirectDebitStartFlowDeps,
): Promise<DirectDebitStartFlowResult> {
	const { agreementId, checkoutSessionId } = parseDirectDebitStartParams(params);
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

	const mode = resolveDirectDebitCheckoutMode(checkoutSessionId);
	const { data, error: invokeErr } = await deps.invokeCreateSubscriptionCheckout(
		buildDirectDebitCheckoutInvokeBody(agreementId, mode, checkoutSessionId),
	);
	if (hasInvokeResponseError(data, invokeErr)) {
		const fallback =
			mode === 'complete' ? resolveDirectDebitCompleteFallbackError() : resolveDirectDebitCheckoutFallbackError();
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
