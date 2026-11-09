import { describe, expect, it } from 'bun:test';
import {
	buildArrangedPaymentLinkInfo,
	buildBillingRecipientBundle,
	buildOpenPaymentLinkInfo,
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
	lesson_type_id: 'lt1',
	is_active: true,
	stripe_schedule_id: null as string | null,
	lesson_types: { name: 'Piano' },
};

describe('paymentLinkInfoHelpers', () => {
	it('resolves lesson form and arranged payload', () => {
		expect(resolveLessonFormName(null)).toBe('Les');
		expect(resolveLessonFormName({ name: 'Gitaar' })).toBe('Gitaar');
		expect(buildArrangedPaymentLinkInfo({ ...agreement, stripe_schedule_id: 'sch_1' })).toEqual({
			valid: true,
			arranged: true,
			lesson_form: 'Piano',
			start_date: '2026-09-01',
			minimum_term_end: '2027-02-28',
		});
	});

	it('builds open payload with catch-up preview', () => {
		const preview = buildPaymentLinkPreview('2026-09-01', '2026-12-01', {
			monthlyCents: 5000,
			yearlyCents: 55000,
		});
		expect(preview).toEqual({ monthlyCents: 5000, yearlyCents: 55000, catchUp: true });
		expect(buildOpenPaymentLinkInfo(agreement, preview).arranged).toBe(false);
		expect(buildPaymentLinkPreview('2026-09-01', '2026-09-15', null)).toBeNull();
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
