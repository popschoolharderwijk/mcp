import { describe, expect, it } from 'bun:test';
import type { AgreementBillingPreview } from '../../../src/lib/billing/agreementBillingPreviewHelpers';
import {
	resolveLessonAgreementPreviewRenderKind,
	resolveLessonAgreementPreviewViewState,
} from '../../../src/lib/students/lessonAgreementPreviewHelpers';

const preview: AgreementBillingPreview = {
	schoolYearLabel: '2026-2027',
	tariff: 'youth',
	pricePerLessonCents: 2000,
	lessonsCount: 36,
	yearlyCents: 72000,
	monthlyCents: 6545,
	leftoverCents: 0,
	lessonDates: [],
	periodStart: '2026-09-01',
	periodEnd: '2027-07-01',
};

describe('resolveLessonAgreementPreviewViewState', () => {
	it('returns loading while preview is loading', () => {
		expect(resolveLessonAgreementPreviewViewState(true, null, null)).toBe('loading');
	});

	it('returns error when preview failed', () => {
		expect(resolveLessonAgreementPreviewViewState(false, 'failed', null)).toBe('error');
	});

	it('returns content when preview data exists', () => {
		expect(resolveLessonAgreementPreviewViewState(false, null, preview)).toBe('content');
	});

	it('returns empty when no preview is available', () => {
		expect(resolveLessonAgreementPreviewViewState(false, null, null)).toBe('empty');
	});
});

describe('resolveLessonAgreementPreviewRenderKind', () => {
	it('returns loading for loading view state', () => {
		expect(resolveLessonAgreementPreviewRenderKind('loading', null)).toBe('loading');
	});

	it('returns error for error view state', () => {
		expect(resolveLessonAgreementPreviewRenderKind('error', null)).toBe('error');
	});

	it('returns content when preview data exists', () => {
		expect(resolveLessonAgreementPreviewRenderKind('content', preview)).toBe('content');
	});

	it('returns none for empty preview state', () => {
		expect(resolveLessonAgreementPreviewRenderKind('empty', null)).toBe('none');
	});
});
