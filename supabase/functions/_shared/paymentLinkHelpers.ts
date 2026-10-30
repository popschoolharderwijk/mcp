/**
 * Fixed payment link per agreement: `/pay?agreement=<id>&t=<token>`.
 * Only the SHA-256 hash of the token is stored. No Deno/DB IO (Bun-testable).
 */

const PAYMENT_LINK_TOKEN_BYTES = 32;
const PAYMENT_LINK_REQUESTS_PER_HOUR = 3;

export const PAYMENT_LINK_REQUEST_MESSAGE =
	'Als dit e-mailadres bij ons bekend is, krijg je binnen een paar minuten een mail met een nieuwe link.';

function toBase64Url(bytes: Uint8Array): string {
	let bin = '';
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function generatePaymentLinkToken(): string {
	const bytes = new Uint8Array(PAYMENT_LINK_TOKEN_BYTES);
	crypto.getRandomValues(bytes);
	return toBase64Url(bytes);
}

export async function hashPaymentLinkToken(token: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
	return Array.from(new Uint8Array(digest))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

function safeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

export function isPlausiblePaymentLinkToken(token: string | null | undefined): token is string {
	return typeof token === 'string' && /^[A-Za-z0-9_-]{40,64}$/.test(token);
}

export async function paymentLinkTokenMatches(
	token: string | null | undefined,
	storedHash: string | null | undefined,
): Promise<boolean> {
	if (!isPlausiblePaymentLinkToken(token) || !storedHash) return false;
	return safeEqual(await hashPaymentLinkToken(token), storedHash);
}

export function buildPaymentLinkUrl(siteUrl: string, agreementId: string, token: string): string {
	const base = siteUrl.replace(/\/+$/, '');
	return `${base}/pay?agreement=${agreementId}&t=${encodeURIComponent(token)}`;
}

function normalizeEmail(email: string | null | undefined): string | null {
	const e = email?.trim().toLowerCase();
	return e ? e : null;
}

/** Recipient for confirmation and payment request: parent e-mail when known, otherwise the account. */
export function resolveBillingRecipient(input: {
	parentEmail: string | null | undefined;
	accountEmail: string | null | undefined;
}): string | null {
	return input.parentEmail?.trim() || input.accountEmail?.trim() || null;
}

export function buildBillingRecipientBundle(
	parentEmail: string | null | undefined,
	accountEmail: string | null | undefined,
): { recipient: string | null; parentEmail: string | null; accountEmail: string | null } {
	const parent = parentEmail ?? null;
	const account = accountEmail ?? null;
	return {
		parentEmail: parent,
		accountEmail: account,
		recipient: resolveBillingRecipient({ parentEmail: parent, accountEmail: account }),
	};
}

export function isPaymentLinkRequestAllowedAddress(
	requested: string,
	addresses: { parentEmail: string | null | undefined; accountEmail: string | null | undefined },
): boolean {
	const r = normalizeEmail(requested);
	if (!r) return false;
	return r === normalizeEmail(addresses.parentEmail) || r === normalizeEmail(addresses.accountEmail);
}

export function isValidEmailInput(email: unknown): email is string {
	return typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isPaymentLinkRequestRateLimited(
	recentRequestCount: number,
	limit = PAYMENT_LINK_REQUESTS_PER_HOUR,
): boolean {
	return recentRequestCount >= limit;
}

export function buildPaymentLinkRequestResponse(): { ok: true; message: string } {
	return { ok: true, message: PAYMENT_LINK_REQUEST_MESSAGE };
}

/** End of the calendar month that contains (start + 6 months − 1 day). Mirrors SQL `compute_minimum_term_end`. */
export function computeMinimumTermEnd(startDate: string): string {
	const [y, m, d] = startDate.split('-').map(Number);
	const mid = new Date(Date.UTC(y, m - 1 + 6, d - 1));
	const end = new Date(Date.UTC(mid.getUTCFullYear(), mid.getUTCMonth() + 1, 0));
	return end.toISOString().slice(0, 10);
}

/** True when the agreement started in an earlier calendar month than today. */
export function needsCatchUpInvoice(startDate: string, today: string): boolean {
	return startDate.slice(0, 7) < today.slice(0, 7);
}

/** Markdown for `{{betaalblok}}` (converted to HTML by send-template-email). */
export function buildPaymentLinkEmailHtml(paymentUrl: string): string {
	return `[Betaalmethode koppelen](${paymentUrl})

Of open deze link: ${paymentUrl}`;
}

export interface PaymentLinkInfoAgreement {
	id: string;
	start_date: string;
	end_date: string | null;
	frequency: string;
	duration_minutes: number;
	day_of_week: number;
	minimum_term_end: string | null;
	student_user_id: string;
	lesson_type_id: string;
	is_active: boolean;
	stripe_schedule_id: string | null;
	lesson_types: { name?: string } | null;
}

export interface PaymentLinkPreviewAmounts {
	monthlyCents: number;
	yearlyCents: number;
	catchUp: boolean;
}

export function resolveLessonFormName(lessonTypes: { name?: string } | null | undefined): string {
	return lessonTypes?.name ?? 'Les';
}

export function buildArrangedPaymentLinkInfo(agreement: PaymentLinkInfoAgreement) {
	return {
		valid: true as const,
		arranged: true as const,
		lesson_form: resolveLessonFormName(agreement.lesson_types),
		start_date: agreement.start_date,
		minimum_term_end: agreement.minimum_term_end,
	};
}

export function buildPaymentLinkPreview(
	startDate: string,
	today: string,
	yearly: { monthlyCents: number; yearlyCents: number } | null,
): PaymentLinkPreviewAmounts | null {
	if (!yearly) return null;
	return {
		monthlyCents: yearly.monthlyCents,
		yearlyCents: yearly.yearlyCents,
		catchUp: needsCatchUpInvoice(startDate, today),
	};
}

export function buildOpenPaymentLinkInfo(
	agreement: PaymentLinkInfoAgreement,
	preview: PaymentLinkPreviewAmounts | null,
) {
	return {
		valid: true as const,
		arranged: false as const,
		lesson_form: resolveLessonFormName(agreement.lesson_types),
		start_date: agreement.start_date,
		minimum_term_end: agreement.minimum_term_end,
		preview,
	};
}
