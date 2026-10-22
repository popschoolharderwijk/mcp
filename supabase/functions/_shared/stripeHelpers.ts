function asRecord(value: unknown): Record<string, unknown> | null {
	return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function readStringProperty(value: Record<string, unknown> | null, key: string): string | null {
	const property = value?.[key];
	return typeof property === 'string' ? property : null;
}

export function readGeneratedSepaDebitFromDetails(details: Record<string, unknown> | null): string | null {
	const direct = readStringProperty(details, 'generated_sepa_debit');
	if (direct) return direct;

	for (const value of Object.values(details ?? {})) {
		const nested = readStringProperty(asRecord(value), 'generated_sepa_debit');
		if (nested) return nested;
	}

	return null;
}

export function readGeneratedSepaDebitPaymentMethodId(latestAttempt: unknown): string | null {
	const details = asRecord(asRecord(latestAttempt)?.payment_method_details);
	return readGeneratedSepaDebitFromDetails(details);
}
