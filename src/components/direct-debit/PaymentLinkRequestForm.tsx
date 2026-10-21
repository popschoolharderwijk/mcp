import { type FormEvent, useState } from 'react';
import { StandaloneCenteredPage } from '@/components/auth/StandalonePageLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '@/components/ui/submit-button';

interface Props {
	intro: string;
	onSubmit: (email: string) => Promise<string>;
}

/** "Stuur me een nieuwe link": always shows the same message afterwards. */
export function PaymentLinkRequestForm({ intro, onSubmit }: Props) {
	const [email, setEmail] = useState('');
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setLoading(true);
		try {
			setMessage(await onSubmit(email));
		} finally {
			setLoading(false);
		}
	};

	return (
		<StandaloneCenteredPage narrow>
			<h1 className="font-bold text-2xl">Stuur me een nieuwe link</h1>
			<p className="text-muted-foreground">{intro}</p>
			{message ? (
				<p role="status">{message}</p>
			) : (
				<form onSubmit={handleSubmit} className="space-y-3 text-left">
					<div className="space-y-1">
						<Label htmlFor="payment-link-email">E-mailadres</Label>
						<Input
							id="payment-link-email"
							type="email"
							required
							autoComplete="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="naam@voorbeeld.nl"
						/>
					</div>
					<SubmitButton type="submit" loading={loading} className="w-full">
						Stuur me een nieuwe link
					</SubmitButton>
				</form>
			)}
		</StandaloneCenteredPage>
	);
}
