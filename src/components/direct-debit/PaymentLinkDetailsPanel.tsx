import { StandaloneCenteredPage } from '@/components/auth/StandalonePageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SubmitButton } from '@/components/ui/submit-button';
import { formatCentsNl } from '@/lib/billing/lessonFeeFormat';
import {
	formatPreviewAmount,
	formatPreviewMonth,
	formatTermText,
	type PaymentLinkInfo,
} from '@/lib/direct-debit/paymentLinkPageHelpers';

interface Props {
	info: PaymentLinkInfo;
	loading: boolean;
	error: string | null;
	onStart: () => void;
}

export function PaymentLinkArrangedPanel() {
	return (
		<StandaloneCenteredPage narrow>
			<h1 className="font-bold text-2xl">Je machtiging is al geregeld</h1>
			<p className="text-muted-foreground">Je hoeft niets meer te doen. Het lesgeld wordt maandelijks afgeschreven.</p>
		</StandaloneCenteredPage>
	);
}

export function PaymentLinkDetailsPanel({ info, loading, error, onStart }: Props) {
	const preview = info.preview;
	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<Card className="w-full max-w-lg">
				<CardHeader>
					<CardTitle>Machtiging afgeven</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4 text-sm">
					<dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2">
						<dt className="text-muted-foreground">Lesvorm</dt>
						<dd>{info.lesson_form}</dd>
						{preview?.monthly && (
							<>
								<dt className="text-muted-foreground">Per maand</dt>
								<dd>{formatPreviewAmount(preview.monthly)}</dd>
							</>
						)}
						{preview?.firstMonth && (
							<>
								<dt className="text-muted-foreground">Eerste maand</dt>
								<dd>{formatPreviewAmount(preview.firstMonth)} (naar rato)</dd>
							</>
						)}
						<dt className="text-muted-foreground">Looptijd</dt>
						<dd>{formatTermText(info.minimum_term_end)}</dd>
					</dl>

					{preview?.catchUp && (
						<div className="space-y-2 rounded-md border p-3">
							<p className="font-medium">
								Inhaalbedrag: {formatCentsNl(preview.catchUp.amountCents)} (direct na je machtiging)
							</p>
							<ul className="space-y-1">
								{preview.catchUp.lines.map((line) => (
									<li key={line.month} className="flex justify-between gap-4">
										<span>{formatPreviewMonth(line)}</span>
										<span>{formatPreviewAmount(line)}</span>
									</li>
								))}
							</ul>
						</div>
					)}

					<p className="text-muted-foreground">
						Je geeft de machtiging met iDEAL via je eigen bank. Daarna schrijven we het lesgeld maandelijks af
						(niet in augustus).
					</p>
					{error && <p className="text-destructive">{error}</p>}
					<SubmitButton loading={loading} loadingLabel="Even geduld..." onClick={onStart} className="w-full">
						Ga naar iDEAL
					</SubmitButton>
				</CardContent>
			</Card>
		</div>
	);
}
