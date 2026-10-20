import { describe, expect, it } from 'bun:test';
import {
	buildDirectDebitInviteLink,
	buildDirectDebitInviteVars,
	buildFirstMonthLine,
	formatInviteCents,
	formatInviteDate,
	formatInviteFeeAmount,
	formatInviteLessonForm,
	type InviteFee,
	resolveInviteFeeMonths,
	resolveInviteRecipientName,
	shouldShowFirstMonth,
} from '../../../supabase/functions/send-direct-debit-invite/sendDirectDebitInvitePure';

const exempt = (cents: number, prorated = false): InviteFee => ({
	amount_cents: cents,
	btw_rate: 0,
	btw_amount_cents: 0,
	is_prorated: prorated,
});

describe('buildDirectDebitInviteLink', () => {
	it('uses the token_hash hash format that /direct-debit/start consumes', () => {
		expect(buildDirectDebitInviteLink('https://mcp.mplifi.nl/direct-debit/start?agreement=abc', 'h/1+2')).toBe(
			'https://mcp.mplifi.nl/direct-debit/start?agreement=abc#token_hash=h%2F1%2B2&type=email',
		);
	});
});

describe('resolveInviteRecipientName', () => {
	it('prefers the parent', () => {
		expect(
			resolveInviteRecipientName({
				studentName: 'Sanne',
				parentName: 'Ingrid',
				debtorName: 'Piet',
				debtorSameAsStudent: false,
			}),
		).toBe('Ingrid');
	});
	it('uses a separate debtor when there is no parent', () => {
		expect(
			resolveInviteRecipientName({
				studentName: 'Sanne',
				parentName: ' ',
				debtorName: 'Piet',
				debtorSameAsStudent: false,
			}),
		).toBe('Piet');
	});
	it('falls back to the student', () => {
		expect(
			resolveInviteRecipientName({
				studentName: 'Sanne',
				parentName: null,
				debtorName: 'Piet',
				debtorSameAsStudent: true,
			}),
		).toBe('Sanne');
	});
});

describe('formatting', () => {
	it('formats cents in Dutch style', () => {
		expect(formatInviteCents(7338)).toBe('€ 73,38');
		expect(formatInviteCents(123456)).toBe('€ 1.234,56');
	});
	it('formats dates as DD-MM-YYYY', () => {
		expect(formatInviteDate('2027-04-30')).toBe('30-04-2027');
		expect(formatInviteDate(null)).toBe('');
	});
	it('shows the VAT text per tariff', () => {
		expect(formatInviteFeeAmount({ amount_cents: 8879, btw_rate: 21, btw_amount_cents: 1541, is_prorated: false })).toBe(
			'€ 88,79 (incl. € 15,41 btw)',
		);
		expect(formatInviteFeeAmount(exempt(7338))).toBe('€ 73,38 (vrijgesteld van btw)');
	});
	it('describes the lesson form', () => {
		expect(formatInviteLessonForm('Popkoor', { duration_minutes: 60, frequency: 'weekly', label: '18+' })).toBe(
			'Popkoor (60 min, wekelijks, 18+)',
		);
	});
});

describe('resolveInviteFeeMonths', () => {
	it('never previews August as the regular month', () => {
		expect(resolveInviteFeeMonths('2027-07-12')).toEqual(['2027-07-01', '2027-09-01']);
		expect(resolveInviteFeeMonths('2026-12-05')).toEqual(['2026-12-01', '2027-01-01']);
	});
});

describe('pro-rata first month line', () => {
	it('is shown when the first month is pro rata and differs', () => {
		expect(shouldShowFirstMonth(exempt(2604, true), exempt(7338))).toBe(true);
		expect(buildFirstMonthLine(exempt(2604, true), exempt(7338))).toContain('€ 26,04');
	});
	it('is hidden for a full first month', () => {
		expect(shouldShowFirstMonth(exempt(7338, false), exempt(7338))).toBe(false);
		expect(buildFirstMonthLine(exempt(7338, true), exempt(7338))).toBe('');
	});
});

describe('buildDirectDebitInviteVars', () => {
	const base = {
		studentName: 'Sanne de Vries',
		recipientName: 'Ingrid de Vries',
		lessonForm: 'Gitaarles (30 min, wekelijks)',
		regularFee: exempt(7338),
		startDate: '2026-10-21',
		minimumTermEnd: '2027-04-30',
		link: 'https://x/#token_hash=a&type=email',
	};
	it('fills every template variable', () => {
		const vars = buildDirectDebitInviteVars({ ...base, firstFee: exempt(2604, true) });
		expect(vars).toEqual({
			leerling_naam: 'Sanne de Vries',
			ontvanger_naam: 'Ingrid de Vries',
			les_type: 'Gitaarles (30 min, wekelijks)',
			bedrag: '€ 73,38 (vrijgesteld van btw)',
			eerste_maand_bedrag: '€ 26,04',
			eerste_maand_regel: '<li>Start je halverwege de maand, dan betaal je de eerste maand naar rato: € 26,04.</li>',
			startdatum: '21-10-2026',
			minimale_looptijd_tot: '30-04-2027',
			link: 'https://x/#token_hash=a&type=email',
		});
	});
	it('leaves the pro-rata fields empty for a full first month', () => {
		const vars = buildDirectDebitInviteVars({ ...base, firstFee: exempt(7338) });
		expect(vars.eerste_maand_bedrag).toBe('');
		expect(vars.eerste_maand_regel).toBe('');
	});
});
