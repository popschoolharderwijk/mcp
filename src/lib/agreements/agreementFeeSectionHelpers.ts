import { formatDateNl } from '@/lib/billing/lessonFeeFormat';

export type DateOfBirthRequirement = 'required' | 'warning' | 'none';

/** SEPA, Stripe and duo (defaults to Stripe) need a date of birth; manual billing only warns. */
export function resolveDateOfBirthRequirement(
	paymentMethod: 'stripe' | 'sepa' | 'manual',
	isDuo: boolean,
	hasDateOfBirth: boolean,
): DateOfBirthRequirement {
	if (hasDateOfBirth) return 'none';
	if (isDuo || paymentMethod !== 'manual') return 'required';
	return 'warning';
}

/** Cache key for the fee preview; null when the lesson form or start date is unknown. */
export function resolveWizardFeePreviewKey(params: {
	optionId: string | null;
	dateOfBirth: string | null;
	startDate: string;
	endDate: string;
}): string | null {
	if (!params.optionId || !params.startDate) return null;
	return [params.optionId, params.dateOfBirth ?? '', params.startDate, params.endDate].join('|');
}

/** Explanation of the term: stored minimum term end or the rule for new agreements. */
export function buildAgreementTermNote(params: {
	minimumTermEnd: string | null | undefined;
	cancellationEffectiveDate: string | null | undefined;
}): string {
	if (params.cancellationEffectiveDate) {
		return `Opgezegd per ${formatDateNl(params.cancellationEffectiveDate)}. Daarna wordt er niet meer geïnd.`;
	}
	const minimum = params.minimumTermEnd
		? `Minimale looptijd tot en met ${formatDateNl(params.minimumTermEnd)}`
		: 'Minimale looptijd 6 maanden vanaf de startdatum';
	return `${minimum}, daarna stilzwijgend verlengd per schooljaar (tot 31 juli). Opzeggen gaat in per einde van de lopende periode.`;
}
