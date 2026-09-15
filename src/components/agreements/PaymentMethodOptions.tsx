import { LuSignature, LuWallet } from 'react-icons/lu';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { handlePaymentMethodSelection, type PaymentMethodValue } from '@/lib/agreements/paymentMethodSectionHelpers';

interface PaymentMethodOptionsProps {
	paymentMethod: PaymentMethodValue;
	onPaymentMethodChange: (value: PaymentMethodValue) => void;
	onSepaMandateIdChange: (value: string | null) => void;
}

export function PaymentMethodOptions({
	paymentMethod,
	onPaymentMethodChange,
	onSepaMandateIdChange,
}: PaymentMethodOptionsProps) {
	return (
		<RadioGroup
			value={paymentMethod}
			onValueChange={(value) => handlePaymentMethodSelection(value, onPaymentMethodChange, onSepaMandateIdChange)}
			className="grid gap-2"
		>
			<label
				htmlFor="pm-sepa"
				className="flex items-start gap-3 rounded-md border bg-background p-3 cursor-pointer hover:bg-accent"
			>
				<RadioGroupItem value="sepa" id="pm-sepa" className="mt-1" />
				<div className="flex-1">
					<div className="flex items-center gap-2 font-medium">
						<LuSignature className="h-4 w-4" /> SEPA-incasso
					</div>
					<p className="text-xs text-muted-foreground">
						Maandelijks automatisch incasseren via een SEPA-mandaat.
					</p>
				</div>
			</label>

			<label
				htmlFor="pm-manual"
				className="flex items-start gap-3 rounded-md border bg-background p-3 cursor-pointer hover:bg-accent"
			>
				<RadioGroupItem value="manual" id="pm-manual" className="mt-1" />
				<div className="flex-1">
					<div className="flex items-center gap-2 font-medium">
						<LuWallet className="h-4 w-4" /> Handmatig / op factuur
					</div>
					<p className="text-xs text-muted-foreground">Geen automatische betaling; je factureert zelf.</p>
				</div>
			</label>
		</RadioGroup>
	);
}
