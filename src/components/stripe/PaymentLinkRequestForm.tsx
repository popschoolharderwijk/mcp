import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';

interface Props {
	agreementId: string;
}

export function PaymentLinkRequestForm({ agreementId }: Props) {
	const [email, setEmail] = useState('');
	const [message, setMessage] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		setMessage(null);
		const { data, error } = await supabase.functions.invoke<{ ok: boolean; message: string }>(
			'request-payment-link',
			{ body: { lesson_agreement_id: agreementId, email } },
		);
		setLoading(false);
		if (error) {
			setMessage('Er ging iets mis. Probeer het later opnieuw.');
			return;
		}
		setMessage(
			data?.message ?? 'Als dit e-mailadres bij ons bekend is, krijg je binnen een paar minuten een mail.',
		);
	}

	return (
		<form onSubmit={onSubmit} className="mx-auto mt-8 max-w-lg space-y-3 rounded-lg border p-4">
			<p className="font-medium text-sm">Stuur me een nieuwe link</p>
			<div className="space-y-1">
				<Label htmlFor="pay-email">E-mailadres</Label>
				<Input
					id="pay-email"
					type="email"
					required
					value={email}
					onChange={(ev) => setEmail(ev.target.value)}
					placeholder="naam@voorbeeld.nl"
				/>
			</div>
			<Button type="submit" disabled={loading} variant="secondary">
				Versturen
			</Button>
			{message && <p className="text-muted-foreground text-sm">{message}</p>}
		</form>
	);
}
