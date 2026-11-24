import { LuMail } from 'react-icons/lu';

interface PublicSignupDoneViewProps {
	email: string;
}

export function PublicSignupDoneView({ email }: PublicSignupDoneViewProps) {
	return (
		<div className="min-h-screen flex items-center justify-center p-4 bg-background">
			<div className="max-w-md w-full text-center space-y-4 rounded-lg border bg-card p-8">
				<div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
					<LuMail className="h-6 w-6 text-primary" />
				</div>
				<h1 className="text-2xl font-bold">Bevestig je e-mailadres</h1>
				<p className="text-muted-foreground">
					We hebben een bevestigingslink gestuurd naar {email}. Klik op die link om je aanmelding af te
					ronden. Pas daarna zien wij je aanvraag.
				</p>
			</div>
		</div>
	);
}
