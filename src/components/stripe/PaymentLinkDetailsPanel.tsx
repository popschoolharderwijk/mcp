import { StandaloneCenteredPage } from '@/components/auth/StandalonePageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SubmitButton } from '@/components/ui/submit-button';
import { formatCentsNl, formatTermText, type PaymentLinkInfo } from '@/lib/stripe/paymentLinkPageHelpers';

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
			<p className="text-muted-foreground">
				Je hoeft niets meer te doen. Het lesgeld wordt maandelijks afgeschreven.
			</p>
		</StandaloneCenteredPage>
	);
}

export function PaymentLinkInvalidPanel() {
	return (
		<StandaloneCenteredPage narrow>
			<h1 className="font-bold text-2xl">Link ongeldig of verlopen</h1>
			<p className="text-muted-foreground">
				Vraag de school om een nieuwe betaallink, of gebruik hieronder “Stuur me een nieuwe link” als je het
				e-mailadres hebt waarmee je bent aangemeld.
			</p>
		</StandaloneCenteredPage>
	);
}

function CatchUpNotice({ show }: { show: boolean }) {
	if (!show) return null;
	return (
		<p className="rounded-md border p-3 text-muted-foreground">
			Omdat de startdatum al voorbij is, brengen we gemiste maanden in één keer in rekening na je machtiging
			(augustus telt niet mee).
		</p>
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
						{preview ? (
							<>
								<dt className="text-muted-foreground">Per maand</dt>
								<dd>{formatCentsNl(preview.monthlyCents)}</dd>
								<dt className="text-muted-foreground">Per schooljaar</dt>
								<dd>{formatCentsNl(preview.yearlyCents)}</dd>
							</>
						) : null}
						<dt className="text-muted-foreground">Looptijd</dt>
						<dd>{formatTermText(info.minimum_term_end)}</dd>
					</dl>
					<CatchUpNotice show={Boolean(preview?.catchUp)} />
					<p className="text-muted-foreground">
						Je geeft de machtiging met iDEAL via je eigen bank. Daarna schrijven we het lesgeld maandelijks
						af (niet in augustus).
					</p>
					{error ? <p className="text-destructive">{error}</p> : null}
					<SubmitButton loading={loading} loadingLabel="Even geduld..." onClick={onStart} className="w-full">
						Ga naar iDEAL
					</SubmitButton>
				</CardContent>
			</Card>
		</div>
	);
}
