/**
 * Payment-method rules shared by the Stripe and SEPA edge functions.
 * Stripe and the own SEPA direct debit run side by side per agreement; an
 * agreement paid via Stripe must never end up in a SEPA batch or in an own
 * invoice, otherwise the customer pays twice.
 */
export type AgreementPaymentMethod = 'stripe' | 'sepa' | 'manual';

export function isStripeAgreement(paymentMethod: string | null | undefined): boolean {
	return paymentMethod === 'stripe';
}

/** Returns a 409 failure when a Stripe action is requested for a non-Stripe agreement. */
export function resolveNotStripeAgreementFailure(
	paymentMethod: string | null | undefined,
): { status: 409; error: string } | null {
	if (isStripeAgreement(paymentMethod)) return null;
	return { status: 409, error: 'Deze overeenkomst gebruikt geen Stripe als betaalmethode' };
}

/** Drops batch items whose linked agreement is paid via Stripe. Items without agreement are kept. */
export function excludeStripeAgreementItems<T extends { lesson_agreement_id: string | null }>(
	items: T[],
	paymentMethodByAgreementId: Map<string, string>,
): T[] {
	return items.filter((item) => {
		if (!item.lesson_agreement_id) return true;
		return !isStripeAgreement(paymentMethodByAgreementId.get(item.lesson_agreement_id));
	});
}

export function collectAgreementIds(items: Array<{ lesson_agreement_id: string | null }>): string[] {
	return [...new Set(items.map((item) => item.lesson_agreement_id).filter((id): id is string => Boolean(id)))];
}

export function buildPaymentMethodMap(rows: Array<{ id: string; payment_method: string }>): Map<string, string> {
	return new Map(rows.map((row) => [row.id, row.payment_method]));
}
