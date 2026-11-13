import { describe, expect, it } from 'bun:test';
import {
	buildAgreementCreatedPaymentMailVars,
	buildAgreementPaymentMailDisplayName,
	buildPaymentLinkEmailHtml,
	buildPaymentLinkRequestResponse,
	buildPaymentLinkUrl,
	computeMinimumTermEnd,
	extractAgreementPaymentMailLessonTypeName,
	generatePaymentLinkToken,
	hashPaymentLinkToken,
	isPaymentLinkRequestAllowedAddress,
	isPaymentLinkRequestRateLimited,
	isPlausiblePaymentLinkToken,
	isValidEmailInput,
	needsCatchUpInvoice,
	PAYMENT_LINK_REQUEST_MESSAGE,
	paymentLinkTokenMatches,
	resolveBillingRecipient,
	resolveIssuedLinkRecipientGate,
	resolveIssuePaymentRecipient,
} from '../../../supabase/functions/_shared/paymentLinkHelpers';

describe('payment link tokens', () => {
	it('generates a plausible token that hashes and matches', async () => {
		const token = generatePaymentLinkToken();
		expect(isPlausiblePaymentLinkToken(token)).toBe(true);
		const hash = await hashPaymentLinkToken(token);
		expect(await paymentLinkTokenMatches(token, hash)).toBe(true);
		expect(await paymentLinkTokenMatches('nope', hash)).toBe(false);
	});

	it('builds the public /pay url', () => {
		expect(buildPaymentLinkUrl('https://app.example.com/', 'agr-1', 'tok')).toBe(
			'https://app.example.com/pay?agreement=agr-1&t=tok',
		);
	});

	it('wraps both payment CTA lines as markdown links', () => {
		expect(buildPaymentLinkEmailHtml('https://app.example.com/pay?t=1')).toBe(
			`[Betaalmethode koppelen](https://app.example.com/pay?t=1)

Of open deze link: [https://app.example.com/pay?t=1](https://app.example.com/pay?t=1)`,
		);
	});
});

describe('billing recipient and request guards', () => {
	it('prefers parent email over account email', () => {
		expect(resolveBillingRecipient({ parentEmail: ' ouder@ex.com ', accountEmail: 'kind@ex.com' })).toBe(
			'ouder@ex.com',
		);
		expect(resolveBillingRecipient({ parentEmail: null, accountEmail: 'kind@ex.com' })).toBe('kind@ex.com');
	});

	it('allows only known billing addresses', () => {
		expect(
			isPaymentLinkRequestAllowedAddress('ouder@ex.com', {
				parentEmail: 'ouder@ex.com',
				accountEmail: 'kind@ex.com',
			}),
		).toBe(true);
		expect(
			isPaymentLinkRequestAllowedAddress('other@ex.com', {
				parentEmail: 'ouder@ex.com',
				accountEmail: 'kind@ex.com',
			}),
		).toBe(false);
	});

	it('validates email input and rate limits', () => {
		expect(isValidEmailInput('a@b.nl')).toBe(true);
		expect(isValidEmailInput('bad')).toBe(false);
		expect(isPaymentLinkRequestRateLimited(2)).toBe(false);
		expect(isPaymentLinkRequestRateLimited(3)).toBe(true);
		expect(buildPaymentLinkRequestResponse()).toEqual({
			ok: true,
			message: PAYMENT_LINK_REQUEST_MESSAGE,
		});
	});

	it('resolves issue-payment-link recipient overrides for privileged callers only', () => {
		expect(resolveIssuePaymentRecipient(undefined, 'billing@ex.com', false)).toEqual({
			ok: true,
			recipient: 'billing@ex.com',
		});
		expect(resolveIssuePaymentRecipient('  test@ex.com ', 'billing@ex.com', true)).toEqual({
			ok: true,
			recipient: 'test@ex.com',
		});
		expect(resolveIssuePaymentRecipient('test@ex.com', 'billing@ex.com', false)).toEqual({
			ok: false,
			status: 403,
			error: 'Geen rechten om de ontvanger te wijzigen',
		});
		expect(resolveIssuePaymentRecipient('bad', 'billing@ex.com', true)).toEqual({
			ok: false,
			status: 400,
			error: 'Ongeldig e-mailadres',
		});
	});

	it('requires a payer address before issuing a payment link mail', () => {
		expect(resolveIssuedLinkRecipientGate({ ok: true, recipient: null })).toEqual({
			ok: false,
			status: 400,
			error: 'Geen e-mailadres voor betaler',
		});
		expect(
			resolveIssuedLinkRecipientGate({
				ok: false,
				status: 403,
				error: 'Geen rechten om de ontvanger te wijzigen',
			}),
		).toEqual({
			ok: false,
			status: 403,
			error: 'Geen rechten om de ontvanger te wijzigen',
		});
		expect(resolveIssuedLinkRecipientGate({ ok: true, recipient: 'a@b.nl' })).toEqual({
			ok: true,
			recipient: 'a@b.nl',
		});
	});
});

describe('minimum term and catch-up', () => {
	it('computes a minimum term end after six months', () => {
		expect(computeMinimumTermEnd('2026-10-15')).toBe('2027-04-30');
	});

	it('needs catch-up when start month is before today month', () => {
		expect(needsCatchUpInvoice('2026-10-01', '2026-10-20')).toBe(false);
		expect(needsCatchUpInvoice('2026-10-01', '2026-12-01')).toBe(true);
	});
});

describe('agreement_created payment mail vars', () => {
	it('formats names, schedule, and price for the template', () => {
		expect(buildAgreementPaymentMailDisplayName('Jan', 'Jansen', 'leerling')).toBe('Jan Jansen');
		expect(extractAgreementPaymentMailLessonTypeName({ name: 'Gitaar' })).toBe('Gitaar');
		expect(
			buildAgreementCreatedPaymentMailVars({
				agreement: {
					day_of_week: 1,
					start_time: '16:30:00',
					start_date: '2026-11-10',
					frequency: 'weekly',
					price_per_lesson: 27.5,
				},
				student: { first_name: 'Sam', last_name: 'Student' },
				teacher: { first_name: 'Tess', last_name: 'Teacher' },
				lessonTypeName: 'Piano',
				paymentCtaMarkdown: '[Betaal](https://x)',
				roomLabel: 'Studio',
			}),
		).toEqual({
			leerling_naam: 'Sam Student',
			docent_naam: 'Tess Teacher',
			les_type: 'Piano',
			frequentie: 'wekelijks',
			prijs_per_les: '€ 27,50',
			dag: 'maandag',
			tijd: '16:30',
			lokaal: 'Studio',
			startdatum: '10-11-2026',
			betaalmethode: 'Stripe',
			betaalblok: '[Betaal](https://x)',
		});
	});
});
