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

export function formatSignupOptionPrice(pricePerLesson: number | null | undefined): string {
	if (pricePerLesson == null) return '';
	return `€ ${Number(pricePerLesson).toFixed(2).replace('.', ',')}`;
}

export function buildSignupConfirmationOptionDetails(
	option: {
		frequency: string | null;
		price_per_lesson: number | null;
	} | null,
): SignupConfirmationOptionDetails {
	if (!option) {
		return { frequentie: '', prijs: '' };
	}
	return {
		frequentie: String(option.frequency ?? ''),
		prijs: formatSignupOptionPrice(option.price_per_lesson),
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
		prijs_per_les: params.optionDetails.prijs,
	};
}
