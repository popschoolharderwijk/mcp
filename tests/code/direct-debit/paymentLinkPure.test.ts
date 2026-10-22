import { describe, expect, it } from 'bun:test';
import {
	buildPaymentLinkRequestResponse,
	buildPaymentLinkUrl,
	buildPaymentPreview,
	generatePaymentLinkToken,
	hashPaymentLinkToken,
	isPaymentLinkRequestAllowedAddress,
	isPaymentLinkRequestRateLimited,
	type PreviewFeeMonth,
	paymentLinkTokenMatches,
	resolveBillingRecipient,
	resolvePreviewMonthRange,
} from '../../../supabase/functions/_shared/paymentLinkPure';

const AGREEMENT_ID = '11111111-1111-1111-1111-111111111111';

describe('payment link token', () => {
	it('generates 32 random bytes as base64url (43 chars), different every time', () => {
		const a = generatePaymentLinkToken();
		expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
		expect(generatePaymentLinkToken()).not.toBe(a);
	});

	it('stores only a sha-256 hex hash, not the token', async () => {
		const token = generatePaymentLinkToken();
		const hash = await hashPaymentLinkToken(token);
		expect(hash).toMatch(/^[0-9a-f]{64}$/);
		expect(hash).not.toContain(token);
	});

	it('matches the right token and rejects others', async () => {
		const token = generatePaymentLinkToken();
		const hash = await hashPaymentLinkToken(token);
		expect(await paymentLinkTokenMatches(token, hash)).toBe(true);
		expect(await paymentLinkTokenMatches(generatePaymentLinkToken(), hash)).toBe(false);
		expect(await paymentLinkTokenMatches(null, hash)).toBe(false);
		expect(await paymentLinkTokenMatches(token, null)).toBe(false);
		expect(await paymentLinkTokenMatches('kort', hash)).toBe(false);
	});
});

describe('buildPaymentLinkUrl', () => {
	it('builds /direct-debit/start?agreement=<id>&t=<token>', () => {
		expect(buildPaymentLinkUrl('https://mcp.mplifi.nl/', AGREEMENT_ID, 'abc_DEF-123')).toBe(
			`https://mcp.mplifi.nl/direct-debit/start?agreement=${AGREEMENT_ID}&t=abc_DEF-123`,
		);
	});
});

describe('resolveBillingRecipient', () => {
	it('prefers the parent e-mail', () => {
		expect(resolveBillingRecipient({ parentEmail: 'ouder@x.nl', accountEmail: 'kind@x.nl' })).toBe('ouder@x.nl');
	});
	it('falls back to the account e-mail', () => {
		expect(resolveBillingRecipient({ parentEmail: '  ', accountEmail: 'kind@x.nl' })).toBe('kind@x.nl');
		expect(resolveBillingRecipient({ parentEmail: null, accountEmail: 'kind@x.nl' })).toBe('kind@x.nl');
	});
	it('returns null without any address', () => {
		expect(resolveBillingRecipient({ parentEmail: null, accountEmail: null })).toBeNull();
	});
});

describe('new link request', () => {
	it('allows only the recipient or account address (case-insensitive)', () => {
		const addresses = { parentEmail: 'Ouder@X.nl', accountEmail: 'kind@x.nl' };
		expect(isPaymentLinkRequestAllowedAddress(' ouder@x.nl ', addresses)).toBe(true);
		expect(isPaymentLinkRequestAllowedAddress('kind@x.nl', addresses)).toBe(true);
		expect(isPaymentLinkRequestAllowedAddress('vreemd@x.nl', addresses)).toBe(false);
	});

	it('limits to 3 requests per hour per agreement', () => {
		expect(isPaymentLinkRequestRateLimited(0)).toBe(false);
		expect(isPaymentLinkRequestRateLimited(2)).toBe(false);
		expect(isPaymentLinkRequestRateLimited(3)).toBe(true);
	});

	it('gives the same answer for known and unknown addresses', () => {
		expect(buildPaymentLinkRequestResponse()).toEqual(buildPaymentLinkRequestResponse());
		expect(buildPaymentLinkRequestResponse().message).toContain('Als dit e-mailadres bij ons bekend is');
	});
});

const m = (month: string, amount_cents: number, is_prorated = false, btw_rate = 0): PreviewFeeMonth => ({
	month,
	amount_cents,
	btw_rate,
	is_prorated,
});

describe('buildPaymentPreview', () => {
	it('one-off always uses the start fee, even after the course started', () => {
		const preview = buildPaymentPreview({
			billingKind: 'one_off',
			startDate: '2026-09-15',
			today: '2026-11-01',
			months: [m('2026-09-01', 12000, false, 21), m('2026-10-01', 0), m('2026-11-01', 0)],
		});
		expect(preview.monthly?.amountCents).toBe(12000);
		expect(preview.monthly?.btwRate).toBe(21);
		expect(preview.catchUp).toBeNull();
		expect(preview.firstMonth).toBeNull();
	});
	it('start halfway October, mandate in December: catch-up Oct (pro rata) + Nov + Dec, monthly from January', () => {
		const p = buildPaymentPreview({
			startDate: '2026-10-15',
			today: '2026-12-03',
			months: [
				m('2026-10-01', 3906, true),
				m('2026-11-01', 7338),
				m('2026-12-01', 7338),
				m('2027-01-01', 7338),
				m('2027-02-01', 7338),
			],
		});
		expect(p.catchUp?.lines.map((l) => l.month)).toEqual(['2026-10-01', '2026-11-01', '2026-12-01']);
		expect(p.catchUp?.amountCents).toBe(3906 + 7338 + 7338);
		expect(p.monthly?.month).toBe('2027-01-01');
		expect(p.firstMonth).toBeNull();
	});

	it('start in July, mandate in September: August stays a €0 line', () => {
		const p = buildPaymentPreview({
			startDate: '2026-07-01',
			today: '2026-09-10',
			months: [
				m('2026-07-01', 8879, false, 21),
				m('2026-08-01', 0),
				m('2026-09-01', 8879, false, 21),
				m('2026-10-01', 8879, false, 21),
			],
		});
		expect(p.catchUp?.lines.map((l) => [l.month, l.amountCents])).toEqual([
			['2026-07-01', 8879],
			['2026-08-01', 0],
			['2026-09-01', 8879],
		]);
		expect(p.catchUp?.amountCents).toBe(17758);
		expect(p.monthly).toEqual({ month: '2026-10-01', amountCents: 8879, btwRate: 21, isProrated: false });
	});

	it('mandate before the start: no catch-up, pro-rata first month only when it differs', () => {
		const p = buildPaymentPreview({
			startDate: '2026-11-16',
			today: '2026-10-21',
			months: [m('2026-11-01', 3669, true), m('2026-12-01', 7338), m('2027-01-01', 7338)],
		});
		expect(p.catchUp).toBeNull();
		expect(p.firstMonth?.amountCents).toBe(3669);
		expect(p.monthly?.amountCents).toBe(7338);
	});

	it('start on the 1st in the future: no first-month line', () => {
		const p = buildPaymentPreview({
			startDate: '2026-11-01',
			today: '2026-10-21',
			months: [m('2026-11-01', 7338), m('2026-12-01', 7338)],
		});
		expect(p.firstMonth).toBeNull();
		expect(p.catchUp).toBeNull();
		expect(p.monthly?.amountCents).toBe(7338);
	});

	it('loads from the start month through two months after today', () => {
		expect(resolvePreviewMonthRange('2026-10-15', '2026-12-03')).toEqual({ fromMonth: '2026-10-01', months: 5 });
		expect(resolvePreviewMonthRange('2026-11-16', '2026-10-21')).toEqual({ fromMonth: '2026-11-01', months: 3 });
	});
});
