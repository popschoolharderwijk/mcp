import { describe, expect, it } from 'bun:test';
import type { LessonFeePreview } from '../../../src/lib/billing/loadLessonFeePreview';
import {
	resolveFirstMonthLabel,
	resolveLessonAgreementPreviewViewState,
} from '../../../src/lib/students/lessonAgreementPreviewHelpers';

const fee = {
	amount_cents: 7338,
	age_category: 'under_21' as const,
	btw_rate: 0,
	amount_excl_btw_cents: 7338,
	btw_amount_cents: 0,
	is_prorated: false,
	tariff_effective_from: '2026-09-01',
};

const preview: LessonFeePreview = {
	firstMonth: { ...fee, month: '2026-09-01' },
	regularMonth: { ...fee, month: '2026-10-01' },
};

describe('resolveLessonAgreementPreviewViewState', () => {
	it('returns loading, error, content or empty', () => {
		expect(resolveLessonAgreementPreviewViewState(true, null, null)).toBe('loading');
		expect(resolveLessonAgreementPreviewViewState(false, 'x', null)).toBe('error');
		expect(resolveLessonAgreementPreviewViewState(false, null, preview)).toBe('content');
		expect(resolveLessonAgreementPreviewViewState(false, null, null)).toBe('empty');
	});
});

describe('resolveFirstMonthLabel', () => {
	it('labels one-off, pro rata and regular first months', () => {
		expect(resolveFirstMonthLabel({ ...preview, regularMonth: null })).toBe('Eenmalig bedrag');
		expect(resolveFirstMonthLabel({ ...preview, firstMonth: { ...preview.firstMonth, is_prorated: true } })).toBe(
			'Eerste maand (naar rato)',
		);
		expect(resolveFirstMonthLabel(preview)).toBe('Eerste maand');
	});
});
