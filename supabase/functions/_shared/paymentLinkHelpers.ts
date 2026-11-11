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

/**
 * Resolves who receives an issued payment link.
 * Arbitrary `recipient_email` is privileged-only — otherwise any student could use
 * the school mail domain as an open relay via their own agreement.
 */
export function resolveIssuePaymentRecipient(
	override: string | undefined,
	billingRecipient: string | null,
	canOverrideRecipient: boolean,
): { ok: true; recipient: string | null } | { ok: false; status: 400 | 403; error: string } {
	if (override === undefined || override.trim() === '') {
		return { ok: true, recipient: billingRecipient };
	}
	if (!canOverrideRecipient) {
		return { ok: false, status: 403, error: 'Geen rechten om de ontvanger te wijzigen' };
	}
	if (!isValidEmailInput(override)) {
		return { ok: false, status: 400, error: 'Ongeldig e-mailadres' };
	}
	return { ok: true, recipient: override.trim() };
}

/** After recipient resolve: require a payer address (issue-payment-link always mails). */
export function resolveIssuedLinkRecipientGate(
	resolved: ReturnType<typeof resolveIssuePaymentRecipient>,
): { ok: true; recipient: string } | { ok: false; status: number; error: string } {
	if (!resolved.ok) return { ok: false, status: resolved.status, error: resolved.error };
	if (!resolved.recipient) {
		return { ok: false, status: 400, error: 'Geen e-mailadres voor betaler' };
	}
	return { ok: true, recipient: resolved.recipient };
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

/**
 * Markdown CTA for the pay link (Dutch user-facing copy).
 * Email templates insert this via the `{{betaalblok}}` placeholder.
 */
export function buildPaymentLinkEmailHtml(paymentUrl: string): string {
	return `[Betaalmethode koppelen](${paymentUrl})

Of open deze link: [${paymentUrl}](${paymentUrl})`;
}

const DAY_NAMES_NL = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];

const FREQUENCY_LABELS: Record<string, string> = {
	weekly: 'wekelijks',
	biweekly: 'om de week',
	monthly: 'maandelijks',
};

const STRIPE_PAYMENT_METHOD_LABEL = 'Stripe';

export type AgreementPaymentMailAgreement = {
	day_of_week: number;
	start_time: string;
	start_date: string;
	frequency: string;
	price_per_lesson: number | null;
};

export type AgreementPaymentMailProfile = {
	first_name?: string | null;
	last_name?: string | null;
};

function formatAgreementPaymentMailPrice(value: number | null | undefined): string {
	if (value === null || value === undefined) return '';
	return new Intl.NumberFormat('nl-NL', {
		style: 'currency',
		currency: 'EUR',
		minimumFractionDigits: 2,
	}).format(value);
}

function formatAgreementPaymentMailDate(iso: string | null | undefined): string {
	if (!iso) return '';
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
	if (!match) return iso;
	return `${match[3]}-${match[2]}-${match[1]}`;
}

function formatAgreementPaymentMailTime(time: string | null | undefined): string {
	if (!time) return '';
	return time.slice(0, 5);
}

export function buildAgreementPaymentMailDisplayName(
	firstName: string | null | undefined,
	lastName: string | null | undefined,
	fallback: string,
): string {
	return `${firstName ?? ''} ${lastName ?? ''}`.trim() || fallback;
}

export function extractAgreementPaymentMailLessonTypeName(
	lessonTypes: { name?: string } | { name?: string }[] | null | undefined,
): string {
	if (Array.isArray(lessonTypes)) return lessonTypes[0]?.name ?? '';
	return lessonTypes?.name ?? '';
}

/** Template vars for `agreement_created` when (re)sending a payment link. */
export function buildAgreementCreatedPaymentMailVars(input: {
	agreement: AgreementPaymentMailAgreement;
	student: AgreementPaymentMailProfile | null | undefined;
	teacher: AgreementPaymentMailProfile | null | undefined;
	lessonTypeName: string;
	paymentCtaMarkdown: string;
}): Record<string, string> {
	const { agreement } = input;
	return {
		leerling_naam: buildAgreementPaymentMailDisplayName(
			input.student?.first_name,
			input.student?.last_name,
			'leerling',
		),
		docent_naam: buildAgreementPaymentMailDisplayName(
			input.teacher?.first_name,
			input.teacher?.last_name,
			'docent',
		),
		les_type: input.lessonTypeName,
		frequentie: FREQUENCY_LABELS[agreement.frequency] ?? agreement.frequency,
		prijs_per_les: formatAgreementPaymentMailPrice(agreement.price_per_lesson),
		dag: DAY_NAMES_NL[agreement.day_of_week] ?? '',
		tijd: formatAgreementPaymentMailTime(agreement.start_time),
		startdatum: formatAgreementPaymentMailDate(agreement.start_date),
		betaalmethode: STRIPE_PAYMENT_METHOD_LABEL,
		betaalblok: input.paymentCtaMarkdown,
	};
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
	teacher_user_id: string;
	lesson_type_id: string;
	is_active: boolean;
	stripe_schedule_id: string | null;
	lesson_types: { name?: string } | null;
}

export interface PaymentLinkPartyProfile {
	first_name: string | null;
	last_name: string | null;
	avatar_url: string | null;
}

export interface PaymentLinkParties {
	student: PaymentLinkPartyProfile;
	teacher: PaymentLinkPartyProfile;
}

type PaymentLinkNameProfile = {
	first_name: string | null;
	last_name: string | null;
	avatar_url: string | null;
} | null;

function toPaymentLinkPartyProfile(profile: PaymentLinkNameProfile): PaymentLinkPartyProfile {
	return {
		first_name: profile?.first_name ?? null,
		last_name: profile?.last_name ?? null,
		avatar_url: profile?.avatar_url ?? null,
	};
}

export function buildPaymentLinkParties(
	student: PaymentLinkNameProfile,
	teacher: PaymentLinkNameProfile,
): PaymentLinkParties {
	return {
		student: toPaymentLinkPartyProfile(student),
		teacher: toPaymentLinkPartyProfile(teacher),
	};
}

export interface PaymentLinkPreviewAmounts {
	monthlyCents: number;
	yearlyCents: number;
	/** monthly + leftover when leftover > 0; otherwise null (same as maandtermijn). */
	finalMonthCents: number | null;
	catchUp: boolean;
	catchUpCents: number | null;
	catchUpFromMonth: string | null;
	catchUpToMonth: string | null;
}

export function resolveLessonFormName(lessonTypes: { name?: string } | null | undefined): string {
	return lessonTypes?.name ?? 'Les';
}

export function buildArrangedPaymentLinkInfo(agreement: PaymentLinkInfoAgreement, parties: PaymentLinkParties) {
	return {
		valid: true as const,
		arranged: true as const,
		lesson_form: resolveLessonFormName(agreement.lesson_types),
		student: parties.student,
		teacher: parties.teacher,
		start_date: agreement.start_date,
		minimum_term_end: agreement.minimum_term_end,
	};
}

export function buildPaymentLinkPreview(
	yearly: {
		monthlyCents: number;
		yearlyCents: number;
		leftoverCents: number;
	} | null,
	catchUpPlan: {
		amountCents: number;
		fromMonth: string;
		toMonth: string;
	} | null,
): PaymentLinkPreviewAmounts | null {
	if (!yearly) return null;
	const leftoverCents = yearly.leftoverCents;
	return {
		monthlyCents: yearly.monthlyCents,
		yearlyCents: yearly.yearlyCents,
		finalMonthCents: leftoverCents > 0 ? yearly.monthlyCents + leftoverCents : null,
		catchUp: catchUpPlan != null,
		catchUpCents: catchUpPlan?.amountCents ?? null,
		catchUpFromMonth: catchUpPlan?.fromMonth ?? null,
		catchUpToMonth: catchUpPlan?.toMonth ?? null,
	};
}

export function buildOpenPaymentLinkInfo(
	agreement: PaymentLinkInfoAgreement,
	preview: PaymentLinkPreviewAmounts | null,
	parties: PaymentLinkParties,
) {
	return {
		valid: true as const,
		arranged: false as const,
		lesson_form: resolveLessonFormName(agreement.lesson_types),
		student: parties.student,
		teacher: parties.teacher,
		start_date: agreement.start_date,
		minimum_term_end: agreement.minimum_term_end,
		preview,
	};
}
