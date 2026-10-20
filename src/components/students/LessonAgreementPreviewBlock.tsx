import type { LessonFeePreview } from '@/lib/billing/loadLessonFeePreview';
import { formatAgeCategoryLabel, formatDateNl, formatLessonFeeAmount } from '@/lib/billing/lessonFeeFormat';
import {
	resolveFirstMonthLabel,
	resolveLessonAgreementPreviewViewState,
} from '@/lib/students/lessonAgreementPreviewHelpers';

interface LessonAgreementPreviewBlockProps {
	loading: boolean;
	error: string | null;
	preview: LessonFeePreview | null;
	/** Shown under the amounts, e.g. the minimum term. */
	termNote?: string | null;
	title?: string;
}

function PreviewContent({ preview }: { preview: LessonFeePreview }) {
	const { firstMonth, regularMonth } = preview;
	return (
		<div className="grid gap-3 sm:grid-cols-2">
			<div>
				<p className="text-xs font-medium text-muted-foreground">{resolveFirstMonthLabel(preview)}</p>
				<p className="font-medium">{formatLessonFeeAmount(firstMonth)}</p>
			</div>
			{regularMonth && (
				<div>
					<p className="text-xs font-medium text-muted-foreground">Maandbedrag (11× per jaar, niet in augustus)</p>
					<p className="font-semibold text-base">{formatLessonFeeAmount(regularMonth)}</p>
				</div>
			)}
			<div>
				<p className="text-xs font-medium text-muted-foreground">Tarief</p>
				<p className="font-medium">{formatAgeCategoryLabel((regularMonth ?? firstMonth).age_category)}</p>
			</div>
			{firstMonth.tariff_effective_from && (
				<div>
					<p className="text-xs font-medium text-muted-foreground">Tarievenlijst</p>
					<p className="font-medium">per {formatDateNl(firstMonth.tariff_effective_from)}</p>
				</div>
			)}
		</div>
	);
}

export function LessonAgreementPreviewBlock({
	loading,
	error,
	preview,
	termNote,
	title = 'Lesgeld',
}: LessonAgreementPreviewBlockProps) {
	const viewState = resolveLessonAgreementPreviewViewState(loading, error, preview);

	return (
		<div className="rounded-md border bg-muted/30 p-4 space-y-3">
			<p className="text-sm font-medium text-muted-foreground">{title}</p>
			{viewState === 'loading' && <p className="text-sm text-muted-foreground">Berekenen…</p>}
			{viewState === 'error' && <p className="text-sm text-destructive">{error}</p>}
			{viewState === 'content' && preview && <PreviewContent preview={preview} />}
			{termNote && <p className="text-xs text-muted-foreground">{termNote}</p>}
		</div>
	);
}
