import { StandaloneCenteredPage } from '@/components/auth/StandalonePageLayout';

export function DirectDebitStartSuccessPanel() {
	return (
		<StandaloneCenteredPage narrow>
			<h1 className="font-bold text-2xl">Incasso is ingesteld</h1>
			<p className="text-muted-foreground">De betaalmethode is gekoppeld en het abonnement wordt aangemaakt.</p>
			<p className="text-muted-foreground text-sm">
				Via het portaal van de Popschool kun je inloggen om al je gegevens over je lidmaatschap, facturen en
				lessen in te zien.
			</p>
			<a
				href="/login"
				className="inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
			>
				Naar het Popschool-portaal
			</a>
		</StandaloneCenteredPage>
	);
}
