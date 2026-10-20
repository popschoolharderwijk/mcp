import type { LessonFeePreview } from '@/lib/billing/loadLessonFeePreview';

export type LessonAgreementPreviewViewState = 'loading' | 'error' | 'content' | 'empty';

export function resolveLessonAgreementPreviewViewState(
	loading: boolean,
	error: string | null,
	preview: LessonFeePreview | null,
): LessonAgreementPreviewViewState {
	if (loading) return 'loading';
	if (error) return 'error';
	if (preview) return 'content';
	return 'empty';
}

/** Label for the first-month row: pro rata, one-off or a regular month. */
export function resolveFirstMonthLabel(preview: LessonFeePreview): string {
	if (!preview.regularMonth) return 'Eenmalig bedrag';
	return preview.firstMonth.is_prorated ? 'Eerste maand (naar rato)' : 'Eerste maand';
}
