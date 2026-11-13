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
	/** Present after Stripe redirect (`session_id`); webhook may still be writing the schedule. */
	hasCheckoutSession?: boolean;
}): PayPageView {
	if (input.loadingInfo) return 'loading';
	if (input.completed) return 'completed';
	if (input.error) return 'details';
	if (input.hasCheckoutSession) return 'loading';
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

/** Poll payment-link-info until the webhook has set the schedule. */
export const MANDATE_AWAIT_POLL_INTERVAL_MS = 1000;
export const MANDATE_AWAIT_MAX_ATTEMPTS = 45;

export function shouldSkipMandateAwait(
	sessionId: string | null,
	agreementId: string,
	token: string,
	completed: boolean,
): boolean {
	return !sessionId || !agreementId || !token || completed;
}

export type MandateAwaitPollResult = 'completed' | 'continue' | 'timeout';

/** `attemptIndex` is 0-based after each poll response. */
export function resolveMandateAwaitPollResult(input: {
	arranged: boolean;
	attemptIndex: number;
	maxAttempts: number;
}): MandateAwaitPollResult {
	if (input.arranged) return 'completed';
	if (input.attemptIndex + 1 >= input.maxAttempts) return 'timeout';
	return 'continue';
}

export function resolveMandateAwaitTimeoutMessage(): string {
	return 'Je betaling is ontvangen, maar de machtiging is nog niet zichtbaar. Vernieuw de pagina over een moment, of neem contact op met de school.';
}

export type MandateAwaitPollOutcome =
	| { status: 'completed'; info: PaymentLinkInfo }
	| { status: 'timeout'; info: PaymentLinkInfo };

/** Poll until payment-link-info reports arranged, or attempts are exhausted. */
export async function runMandateAwaitPoll(input: {
	fetchInfo: () => Promise<PaymentLinkInfo>;
	maxAttempts: number;
	intervalMs: number;
	sleep: (ms: number) => Promise<void>;
	isCancelled?: () => boolean;
}): Promise<MandateAwaitPollOutcome> {
	let attemptIndex = 0;
	let info: PaymentLinkInfo = { valid: false };
	while (!input.isCancelled?.()) {
		info = await input.fetchInfo();
		if (input.isCancelled?.()) break;
		const result = resolveMandateAwaitPollResult({
			arranged: Boolean(info.arranged),
			attemptIndex,
			maxAttempts: input.maxAttempts,
		});
		if (result === 'completed') return { status: 'completed', info };
		if (result === 'timeout') return { status: 'timeout', info };
		attemptIndex += 1;
		await input.sleep(input.intervalMs);
	}
	return { status: 'timeout', info };
}
