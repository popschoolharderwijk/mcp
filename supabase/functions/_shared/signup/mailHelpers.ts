/**
 * Shared signup confirmation / received mail vars + recipient. No Deno/DB IO for pure helpers.
 */

import { type FrequencyKey, getFrequencyLabel } from '../../../../src/lib/frequenciesHelpers.ts';

export interface SignupMailPersonFields {
	first_name: string;
	last_name: string;
	email: string;
	parent_email?: string | null;
}

export interface SignupConfirmationOptionDetails {
	frequentie: string;
	prijs: string;
}

export function buildSignupMailFullName(body: SignupMailPersonFields): string {
	return `${body.first_name.trim()} ${body.last_name.trim()}`.trim();
}

export function resolveSignupMailRecipientEmail(body: SignupMailPersonFields): string {
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
		frequency: FrequencyKey;
		price_per_lesson: number | null;
	} | null,
): SignupConfirmationOptionDetails {
	if (!option) {
		return { frequentie: '', prijs: '' };
	}
	return {
		frequentie: getFrequencyLabel(option.frequency),
		prijs: formatSignupOptionPrice(option.price_per_lesson),
	};
}

export function buildSignupMailBaseVars(params: {
	body: SignupMailPersonFields;
	lessonTypeName: string | null | undefined;
	optionDetails: SignupConfirmationOptionDetails;
}) {
	return {
		leerling_naam: buildSignupMailFullName(params.body),
		les_type: params.lessonTypeName ?? '',
		frequentie: params.optionDetails.frequentie,
		prijs_per_les: params.optionDetails.prijs,
	};
}

export function buildSignupConfirmEmailVars(params: {
	body: SignupMailPersonFields;
	lessonTypeName: string | null | undefined;
	optionDetails: SignupConfirmationOptionDetails;
	confirmUrl: string;
}) {
	return {
		...buildSignupMailBaseVars(params),
		bevestigingslink: params.confirmUrl,
	};
}

export function buildSignupConfirmUrl(siteUrl: string, token: string): string {
	const base = siteUrl.replace(/\/+$/, '');
	return `${base}/signup/confirm?token=${encodeURIComponent(token)}`;
}
