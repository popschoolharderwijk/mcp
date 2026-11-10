function asRecord(value: unknown): Record<string, unknown> | null {
	return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function readStringProperty(value: Record<string, unknown> | null, key: string): string | null {
	const property = value?.[key];
	return typeof property === 'string' ? property : null;
}

export function getStripeId(value: unknown): string | null {
	if (typeof value === 'string') return value;
	return readStringProperty(asRecord(value), 'id');
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

export type PaymentMethodFingerprintSource = {
	id: string;
	type?: string | null;
	sepa_debit?: { fingerprint?: string | null } | null;
	card?: { fingerprint?: string | null } | null;
};

/** Fingerprint of the underlying instrument (same bank account / card → same fingerprint). */
export function readPaymentMethodFingerprint(pm: PaymentMethodFingerprintSource): string | null {
	if (pm.type === 'sepa_debit') return pm.sepa_debit?.fingerprint ?? null;
	if (pm.type === 'card') return pm.card?.fingerprint ?? null;
	return null;
}

/**
 * Older payment methods to detach after a rematch: same type + fingerprint as the kept method,
 * never a different instrument.
 */
export function selectDuplicateFingerprintPaymentMethodIds(
	kept: PaymentMethodFingerprintSource,
	candidates: PaymentMethodFingerprintSource[],
): string[] {
	const fingerprint = readPaymentMethodFingerprint(kept);
	if (!fingerprint || !kept.type) return [];
	return candidates
		.filter(
			(candidate) =>
				candidate.id !== kept.id &&
				candidate.type === kept.type &&
				readPaymentMethodFingerprint(candidate) === fingerprint,
		)
		.map((candidate) => candidate.id);
}
