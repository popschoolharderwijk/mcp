import { describe, expect, it } from 'bun:test';
import {
	buildArrangedPaymentLinkInfo,
	buildBillingRecipientBundle,
	buildOpenPaymentLinkInfo,
	buildPaymentLinkParties,
	buildPaymentLinkPreview,
	resolveLessonFormName,
} from '../../../supabase/functions/_shared/paymentLinkHelpers';
import {
	invalidPaymentLinkParamsResponse,
	parsePaymentLinkTokenBody,
} from '../../../supabase/functions/_shared/paymentLinkHttpHelpers';

const agreement = {
	id: 'a1',
	start_date: '2026-09-01',
	end_date: null,
	frequency: 'weekly',
	duration_minutes: 30,
	day_of_week: 1,
	minimum_term_end: '2027-02-28',
	student_user_id: 's1',
	teacher_user_id: 't1',
	lesson_type_id: 'lt1',
	is_active: true,
	stripe_schedule_id: null as string | null,
	lesson_types: { name: 'Piano' },
};

const parties = {
	student: {
		first_name: 'Roan',
		last_name: 'van der Steen',
		avatar_url: 'https://example.com/roan.png',
	},
	teacher: {
		first_name: 'Sam',
		last_name: 'Docent',
		avatar_url: null,
	},
};

describe('paymentLinkInfoHelpers', () => {
	it('resolves lesson form and arranged payload', () => {
		expect(resolveLessonFormName(null)).toBe('Les');
		expect(resolveLessonFormName({ name: 'Gitaar' })).toBe('Gitaar');
		expect(buildArrangedPaymentLinkInfo({ ...agreement, stripe_schedule_id: 'sch_1' }, parties)).toEqual({
			valid: true,
			arranged: true,
			lesson_form: 'Piano',
			student: parties.student,
			teacher: parties.teacher,
			start_date: '2026-09-01',
			minimum_term_end: '2027-02-28',
		});
	});

	it('builds open payload with catch-up preview and party profiles', () => {
		const preview = buildPaymentLinkPreview(
			{ monthlyCents: 5000, yearlyCents: 55000, leftoverCents: 50 },
			{ amountCents: 15000, fromMonth: '2026-09', toMonth: '2026-11' },
		);
		expect(preview?.finalMonthCents).toBe(5050);
		expect(preview?.catchUp).toBe(true);
		expect(preview?.catchUpCents).toBe(15000);
		expect(buildOpenPaymentLinkInfo(agreement, preview, parties).preview).toEqual(preview);
		expect(buildPaymentLinkPreview(null, null)).toBeNull();
		expect(
			buildPaymentLinkPreview({ monthlyCents: 5000, yearlyCents: 55000, leftoverCents: 0 }, null)
				?.finalMonthCents,
		).toBeNull();
	});

	it('maps party profiles and nulls missing avatar fields', () => {
		expect(
			buildPaymentLinkParties(
				{ first_name: 'Roan', last_name: 'van der Steen', avatar_url: 'https://example.com/roan.png' },
				null,
			),
		).toEqual({
			student: {
				first_name: 'Roan',
				last_name: 'van der Steen',
				avatar_url: 'https://example.com/roan.png',
			},
			teacher: {
				first_name: null,
				last_name: null,
				avatar_url: null,
			},
		});
	});
});

describe('paymentLinkHttpHelpers', () => {
	it('parses token body or rejects', () => {
		expect(
			parsePaymentLinkTokenBody({
				lesson_agreement_id: '11111111-1111-1111-1111-111111111111',
				token: 'tok',
			}),
		).toEqual({
			lesson_agreement_id: '11111111-1111-1111-1111-111111111111',
			token: 'tok',
		});
		expect(parsePaymentLinkTokenBody({ lesson_agreement_id: 'bad', token: 'tok' })).toBeNull();
		expect(invalidPaymentLinkParamsResponse().status).toBe(400);
	});
});

describe('buildBillingRecipientBundle', () => {
	it('prefers parent email', () => {
		expect(buildBillingRecipientBundle('ouder@ex.com', 'kind@ex.com')).toEqual({
			parentEmail: 'ouder@ex.com',
			accountEmail: 'kind@ex.com',
			recipient: 'ouder@ex.com',
		});
	});
});
