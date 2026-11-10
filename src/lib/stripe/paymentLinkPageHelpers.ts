/** Display helpers for the public /pay page. */

import { getInvokeErrorMessage } from '@/lib/auth/invokeError';
import { formatDbDateToUi } from '@/lib/date/date-format';

export interface PaymentLinkPreview {
	monthlyCents: number;
	yearlyCents: number;
	catchUp: boolean;
}

export interface PaymentLinkPartyProfile {
	first_name: string | null;
	last_name: string | null;
	avatar_url: string | null;
}

export interface PaymentLinkInfo {
	valid: boolean;
	arranged?: boolean;
	lesson_form?: string;
	student?: PaymentLinkPartyProfile;
	teacher?: PaymentLinkPartyProfile;
	start_date?: string;
	minimum_term_end?: string | null;
	preview?: PaymentLinkPreview | null;
}

export function formatCentsNl(cents: number): string {
	return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export function formatTermText(minimumTermEnd: string | null | undefined): string {
	const base = 'daarna loopt de overeenkomst per schooljaar door (tot 31 juli) en wordt stilzwijgend verlengd.';
	if (!minimumTermEnd) return `Eerste periode van 6 maanden; ${base}`;
	return `Eerste periode tot en met ${formatDbDateToUi(minimumTermEnd)}; ${base}`;
}

export type PayPageView = 'loading' | 'completed' | 'arranged' | 'invalid' | 'details';

export function resolvePayPageView(input: {
	loadingInfo: boolean;
	completed: boolean;
	info: PaymentLinkInfo | null;
}): PayPageView {
	if (input.loadingInfo) return 'loading';
	if (input.completed) return 'completed';
	if (input.info?.arranged) return 'arranged';
	if (!input.info?.valid) return 'invalid';
	return 'details';
}

export function resolvePaymentLinkInfoFromInvoke(
	data: PaymentLinkInfo | null | undefined,
	invokeError: unknown,
): PaymentLinkInfo {
	if (invokeError || !data) return { valid: false };
	return data;
}

export async function resolveCheckoutStartError(startError: unknown, url: string | undefined): Promise<string> {
	if (!startError && url) return '';
	return getInvokeErrorMessage(startError, { fallback: 'Kon Stripe Checkout niet starten' });
}

export function shouldSkipCompleteCheckout(
	sessionId: string | null,
	agreementId: string,
	token: string,
	completed: boolean,
): boolean {
	return !sessionId || !agreementId || !token || completed;
}

export function markPaymentLinkArranged(prev: PaymentLinkInfo | null): PaymentLinkInfo | null {
	return prev ? { ...prev, arranged: true } : prev;
}

export async function resolveCompleteCheckoutErrorMessage(completeError: unknown): Promise<string | null> {
	if (!completeError) return null;
	return getInvokeErrorMessage(completeError, { fallback: 'Afronden mislukt' });
}
