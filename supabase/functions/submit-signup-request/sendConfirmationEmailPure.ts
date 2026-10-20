import type { SignupRequest } from './types.ts';

export interface SignupConfirmationOptionDetails {
	frequentie: string;
	prijs: string;
}

export function buildSignupConfirmationFullName(body: SignupRequest): string {
	return `${body.first_name.trim()} ${body.last_name.trim()}`.trim();
}

export function resolveSignupConfirmationRecipientEmail(body: SignupRequest): string {
	const parentEmail = body.parent_email?.trim();
	const recipient = parentEmail && parentEmail.length > 0 ? parentEmail : body.email;
	return recipient.toLowerCase();
}

function formatEuroCents(cents: number): string {
	return `€ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

/** "€ 73,38 per maand (21+: € 88,79)" or "€ 66,00 eenmalig" from the tariff in force. */
export function formatSignupOptionAmount(
	billingKind: string | null | undefined,
	tariff: { amount_under_21_cents: number | null; amount_adult_cents: number | null } | null,
): string {
	if (!tariff) return '';
	const suffix = billingKind === 'one_off' ? 'eenmalig' : 'per maand';
	const under = tariff.amount_under_21_cents;
	const adult = tariff.amount_adult_cents;
	if (under != null && adult != null) return `${formatEuroCents(under)} ${suffix} (21+: ${formatEuroCents(adult)})`;
	if (under != null) return `${formatEuroCents(under)} ${suffix}`;
	if (adult != null) return `${formatEuroCents(adult)} ${suffix} (21+-tarief)`;
	return '';
}

export function buildSignupConfirmationOptionDetails(
	option: {
		frequency: string | null;
		billing_kind?: string | null;
	} | null,
	tariff: { amount_under_21_cents: number | null; amount_adult_cents: number | null } | null = null,
): SignupConfirmationOptionDetails {
	if (!option) {
		return { frequentie: '', prijs: '' };
	}
	return {
		frequentie: String(option.frequency ?? ''),
		prijs: formatSignupOptionAmount(option.billing_kind, tariff),
	};
}

export function buildSignupConfirmationEmailVars(params: {
	body: SignupRequest;
	lessonTypeName: string | null | undefined;
	optionDetails: SignupConfirmationOptionDetails;
}) {
	return {
		leerling_naam: buildSignupConfirmationFullName(params.body),
		les_type: params.lessonTypeName ?? '',
		frequentie: params.optionDetails.frequentie,
		bedrag: params.optionDetails.prijs,
	};
}
