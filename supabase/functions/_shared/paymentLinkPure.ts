/**
 * Fixed payment link per agreement: `/direct-debit/start?agreement=<id>&t=<token>`.
 * Only the SHA-256 hash of the token is stored (agreement_payment_links); a new token
 * replaces the old one on every (re)send. No Deno/DB IO here (Bun-testable).
 */
import { needsCatchUp } from './catchUpInvoicePure.ts';
import { monthStart } from './subscriptionPlanPure.ts';

export const PAYMENT_LINK_TOKEN_BYTES = 32;
export const PAYMENT_LINK_REQUESTS_PER_HOUR = 3;

/** Same answer for known and unknown addresses (never leak whether an account exists). */
export const PAYMENT_LINK_REQUEST_MESSAGE =
	'Als dit e-mailadres bij ons bekend is, krijg je binnen een paar minuten een mail met een nieuwe link.';

function toBase64Url(bytes: Uint8Array): string {
	let bin = '';
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** 32 random bytes, base64url (43 chars). */
export function generatePaymentLinkToken(): string {
	const bytes = new Uint8Array(PAYMENT_LINK_TOKEN_BYTES);
	crypto.getRandomValues(bytes);
	return toBase64Url(bytes);
}

/** Hex SHA-256 of the token. */
export async function hashPaymentLinkToken(token: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
	return Array.from(new Uint8Array(digest))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

/** Constant-time comparison of two hex strings of equal length. */
function safeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

export function isPlausiblePaymentLinkToken(token: string | null | undefined): token is string {
	return typeof token === 'string' && /^[A-Za-z0-9_-]{40,64}$/.test(token);
}

/** Compare a presented token with the stored hash (hash first, then constant-time compare). */
export async function paymentLinkTokenMatches(
	token: string | null | undefined,
	storedHash: string | null | undefined,
): Promise<boolean> {
	if (!isPlausiblePaymentLinkToken(token) || !storedHash) return false;
	return safeEqual(await hashPaymentLinkToken(token), storedHash);
}

export function buildPaymentLinkUrl(siteUrl: string, agreementId: string, token: string): string {
	const base = siteUrl.replace(/\/+$/, '');
	return `${base}/direct-debit/start?agreement=${agreementId}&t=${encodeURIComponent(token)}`;
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

/** A new link is only mailed when the address is the billing recipient or the account address. */
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

/** Max 3 requests per hour per agreement. */
export function isPaymentLinkRequestRateLimited(
	recentRequestCount: number,
	limit = PAYMENT_LINK_REQUESTS_PER_HOUR,
): boolean {
	return recentRequestCount >= limit;
}

/** The response body of request-payment-link never depends on whether anything was sent. */
export function buildPaymentLinkRequestResponse(): { ok: true; message: string } {
	return { ok: true, message: PAYMENT_LINK_REQUEST_MESSAGE };
}

// ---------------------------------------------------------------------------
// Preview of the amounts shown before the mandate (same SQL months as the schedule build)
// ---------------------------------------------------------------------------

export interface PreviewFeeMonth {
	month: string; // YYYY-MM-01
	amount_cents: number;
	btw_rate: number;
	is_prorated: boolean;
}

export interface PreviewLine {
	month: string;
	amountCents: number;
	btwRate: number;
	isProrated: boolean;
}

export interface PaymentPreview {
	monthly: PreviewLine | null;
	firstMonth: PreviewLine | null;
	catchUp: { lines: PreviewLine[]; amountCents: number; fromMonth: string; toMonth: string } | null;
}

const toLine = (m: PreviewFeeMonth): PreviewLine => ({
	month: m.month,
	amountCents: m.amount_cents,
	btwRate: m.btw_rate,
	isProrated: m.is_prorated,
});

/** Month from which to load fee months, and how many, for the preview. */
export function resolvePreviewMonthRange(startDate: string, today: string): { fromMonth: string; months: number } {
	const start = monthStart(startDate);
	const current = monthStart(today);
	if (start >= current) return { fromMonth: start, months: 3 };
	const [sy, sm] = start.split('-').map(Number);
	const [cy, cm] = current.split('-').map(Number);
	return { fromMonth: start, months: (cy - sy) * 12 + (cm - sm) + 3 };
}

/**
 * - Mandate after the start month: all months up to and including the current month on one
 *   catch-up invoice (August €0 stays a line), monthly from the next billable month.
 * - Otherwise: a pro-rata first month (only when it differs) and the regular monthly amount.
 */
export function buildPaymentPreview(input: {
	startDate: string;
	today: string;
	months: PreviewFeeMonth[];
}): PaymentPreview {
	const sorted = [...input.months].sort((a, b) => a.month.localeCompare(b.month));
	const isRegular = (m: PreviewFeeMonth) => !m.is_prorated && m.amount_cents > 0;

	if (needsCatchUp(input.startDate, input.today)) {
		const current = monthStart(input.today);
		const missed = sorted.filter((m) => m.month <= current);
		const amountCents = missed.reduce((s, m) => s + m.amount_cents, 0);
		const after = sorted.filter((m) => m.month > current);
		const monthly = after.find(isRegular) ?? null;
		return {
			monthly: monthly ? toLine(monthly) : null,
			firstMonth: null,
			catchUp:
				amountCents > 0 && missed.length
					? {
							lines: missed.map(toLine),
							amountCents,
							fromMonth: missed[0].month,
							toMonth: missed[missed.length - 1].month,
						}
					: null,
		};
	}

	const startMonth = monthStart(input.startDate);
	const first = sorted.find((m) => m.month === startMonth) ?? null;
	const monthly =
		sorted.find((m) => m.month > startMonth && isRegular(m)) ?? (first && isRegular(first) ? first : null);
	const showFirst = Boolean(first?.is_prorated && first.amount_cents !== monthly?.amount_cents);
	return {
		monthly: monthly ? toLine(monthly) : null,
		firstMonth: showFirst && first ? toLine(first) : null,
		catchUp: null,
	};
}
