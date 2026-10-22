export type CheckoutFlowMode = 'complete' | 'direct' | 'checkout';

export function resolveCheckoutFlowMode(
	mode: CheckoutFlowMode,
	handlers: {
		complete: () => Promise<Response>;
		direct: () => Promise<Response>;
		checkout: () => Promise<Response>;
	},
): Promise<Response> {
	if (mode === 'complete') return handlers.complete();
	if (mode === 'direct') return handlers.direct();
	return handlers.checkout();
}
