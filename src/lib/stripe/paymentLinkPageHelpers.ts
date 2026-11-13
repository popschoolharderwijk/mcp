/** Display helpers for the public /pay page. */

import { getInvokeErrorMessage } from '@/lib/auth/invokeError';
import { formatDbDateToUi } from '@/lib/date/date-format';

export interface PaymentLinkPreview {
	monthlyCents: number;
	yearlyCents: number;
	catchUp: boolean;
	catchUpCents: number | null;
	catchUpFromMonth: string | null;
	catchUpToMonth: string | null;
}

/** Display YYYY-MM as MM-YYYY for Dutch pay-page copy. */
function formatBillingMonthLabel(month: string): string {
	return `${month.slice(5, 7)}-${month.slice(0, 4)}`;
}

/** Dutch catch-up notice on /pay, or null when preview has no catch-up amount. */
export function buildCatchUpNoticeText(preview: PaymentLinkPreview): string | null {
	if (!preview.catchUp || preview.catchUpCents == null) return null;
	const range =
		preview.catchUpFromMonth && preview.catchUpToMonth
			? ` (${formatBillingMonthLabel(preview.catchUpFromMonth)} t/m ${formatBillingMonthLabel(preview.catchUpToMonth)})`
			: '';
	return `Omdat de startdatum al voorbij is, brengen we gemiste maanden${range} in één keer in rekening na je machtiging: ${formatCentsNl(preview.catchUpCents)} (augustus telt niet mee).`;
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
	error?: string | null;
}): PayPageView {
	if (input.loadingInfo) return 'loading';
	if (input.completed) return 'completed';
	// Checkout complete failed: keep the form visible with the error message.
	if (input.error) return 'details';
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
