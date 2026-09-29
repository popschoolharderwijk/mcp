import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
	maskSepaIban,
	resolveSepaMandateFieldView,
	type SepaMandateOption,
} from '@/lib/agreements/paymentMethodSectionHelpers';

interface SepaMandateSelectListProps {
	mandates: SepaMandateOption[];
	sepaMandateId: string | null;
	onSepaMandateIdChange: (value: string | null) => void;
}

function SepaMandateSelectList({ mandates, sepaMandateId, onSepaMandateIdChange }: SepaMandateSelectListProps) {
	return (
		<Select value={sepaMandateId ?? ''} onValueChange={(value) => onSepaMandateIdChange(value || null)}>
			<SelectTrigger id="sepa-mandate">
				<SelectValue placeholder="Kies een mandaat" />
			</SelectTrigger>
			<SelectContent>
				{mandates.map((mandate) => (
					<SelectItem key={mandate.id} value={mandate.id}>
						{mandate.mandate_reference} — {mandate.account_holder} ({maskSepaIban(mandate.iban)})
						{mandate.status === 'pending' ? ' • in afwachting' : ''}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

function SepaMandateEmptyMessage() {
	return (
		<p className="text-sm text-amber-600">
			Geen actief mandaat gevonden voor deze leerling. Maak eerst een mandaat aan via{' '}
			<a href="/mandates" className="underline">
				Mandaten
			</a>
			.
		</p>
	);
}

function SepaMandateLoadingMessage() {
	return <p className="text-sm text-muted-foreground">Mandaten laden…</p>;
}

interface SepaMandateFieldProps {
	loading: boolean;
	mandates: SepaMandateOption[];
	sepaMandateId: string | null;
	onSepaMandateIdChange: (value: string | null) => void;
}

export function SepaMandateField({ loading, mandates, sepaMandateId, onSepaMandateIdChange }: SepaMandateFieldProps) {
	const view = resolveSepaMandateFieldView(loading, mandates.length);

	return (
		<div className="space-y-2">
			<Label htmlFor="sepa-mandate">SEPA-mandaat</Label>
			{view === 'loading' && <SepaMandateLoadingMessage />}
			{view === 'empty' && <SepaMandateEmptyMessage />}
			{view === 'select' && (
				<SepaMandateSelectList
					mandates={mandates}
					sepaMandateId={sepaMandateId}
					onSepaMandateIdChange={onSepaMandateIdChange}
				/>
			)}
		</div>
	);
}
