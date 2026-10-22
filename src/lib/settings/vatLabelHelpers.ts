/** Dutch UI labels that include the configured standard VAT rate. */

export function formatVatPercentLabel(standardRatePercent: number): string {
	return `BTW ${standardRatePercent}%`;
}

export function formatVatPayableAccountLabel(standardRatePercent: number): string {
	return `BTW af te dragen ${standardRatePercent}%`;
}

export function formatVatCodeFieldLabel(standardRatePercent: number): string {
	return `BTW-code ${standardRatePercent}%`;
}

export function formatAdultVatBadgeLabel(standardRatePercent: number): string {
	return `Volwassenen (${formatVatPercentLabel(standardRatePercent)})`;
}
