import type { AgreementBillingPreview } from '@/hooks/useAgreementBillingPreview';
import { formatAgreementCents } from '@/lib/students/lessonAgreementDialogHelpers';
import {
	resolveLessonAgreementPreviewRenderKind,
	resolveLessonAgreementPreviewViewState,
} from '@/lib/students/lessonAgreementPreviewHelpers';

interface LessonAgreementPreviewBlockProps {
	loading: boolean;
	error: string | null;
	preview: AgreementBillingPreview | null;
}

function LessonAgreementPreviewContent({ preview }: { preview: AgreementBillingPreview }) {
	const tariffLabel = preview.tariff === 'youth' ? 'Jongeren tarief' : 'Volwassenen tarief';

	return (
		<div className="grid gap-3 sm:grid-cols-2">
			<div>
				<p className="text-xs font-medium text-muted-foreground">Schooljaar</p>
				<p className="font-medium">{preview.schoolYearLabel}</p>
			</div>
			<div>
				<p className="text-xs font-medium text-muted-foreground">Tarief</p>
				<p className="font-medium">
					{tariffLabel} — {formatAgreementCents(preview.pricePerLessonCents)} per les
				</p>
			</div>
			<div>
				<p className="text-xs font-medium text-muted-foreground">Lessen dit jaar</p>
				<p className="font-medium">{preview.lessonsCount}</p>
			</div>
			<div>
				<p className="text-xs font-medium text-muted-foreground">Jaarbedrag</p>
				<p className="font-medium">{formatAgreementCents(preview.yearlyCents)}</p>
			</div>
			<div className="sm:col-span-2">
				<p className="text-xs font-medium text-muted-foreground">Maandbedrag (× 11, augustus geen incasso)</p>
				<p className="font-semibold text-base">
					{formatAgreementCents(preview.monthlyCents)}
					{preview.leftoverCents > 0 && (
						<span className="text-xs font-normal text-muted-foreground ml-2">
							(laatste maand +{formatAgreementCents(preview.leftoverCents)})
						</span>
					)}
				</p>
			</div>
		</div>
	);
}

function LessonAgreementPreviewState({
	viewState,
	error,
	preview,
}: {
	viewState: ReturnType<typeof resolveLessonAgreementPreviewViewState>;
	error: string | null;
	preview: AgreementBillingPreview | null;
}) {
	const renderKind = resolveLessonAgreementPreviewRenderKind(viewState, preview);
	if (renderKind === 'loading') return <p className="text-sm text-muted-foreground">Berekenen…</p>;
	if (renderKind === 'error') return <p className="text-sm text-destructive">{error}</p>;
	if (renderKind === 'content') return <LessonAgreementPreviewContent preview={preview as AgreementBillingPreview} />;
	return null;
}

export function LessonAgreementPreviewBlock({ loading, error, preview }: LessonAgreementPreviewBlockProps) {
	const viewState = resolveLessonAgreementPreviewViewState(loading, error, preview);

	return (
		<div className="rounded-md border bg-muted/30 p-4">
			<p className="text-sm font-medium text-muted-foreground mb-3">Incasso-preview</p>
			<LessonAgreementPreviewState viewState={viewState} error={error} preview={preview} />
		</div>
	);
}
