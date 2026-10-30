import { isValidIban, normalizeIban } from '../_shared/ibanHelpers.ts';
import type { SepaFields, SignupRequest } from './types.ts';
import { bad } from './validation.ts';

export function parseSepaFields(
	body: SignupRequest,
): { ok: true; sepa: SepaFields } | { ok: false; response: Response } {
	if (!body.sepa_iban && !body.sepa_account_holder) {
		return { ok: true, sepa: { sepaIban: null, sepaHolder: null, sepaBic: null } };
	}
	if (!body.sepa_iban || !isValidIban(body.sepa_iban)) return { ok: false, response: bad('Ongeldig IBAN') };
	if (!body.sepa_account_holder?.trim()) return { ok: false, response: bad('Rekeninghouder is verplicht bij SEPA') };
	return {
		ok: true,
		sepa: {
			sepaIban: normalizeIban(body.sepa_iban),
			sepaHolder: body.sepa_account_holder.trim(),
			sepaBic: body.sepa_bic?.trim().toUpperCase() || null,
		},
	};
}

export function buildInsertPayload(body: SignupRequest, optionId: string | null, sepa: SepaFields) {
	return {
		lesson_type_id: body.lesson_type_id,
		lesson_group_id: body.lesson_group_id ?? null,
		lesson_type_option_id: optionId,
		first_name: body.first_name.trim(),
		last_name: body.last_name.trim(),
		email: body.email.trim().toLowerCase(),
		phone_number: body.phone_number?.trim() || null,
		date_of_birth: body.date_of_birth || null,
		parent_name: body.parent_name?.trim() || null,
		parent_email: body.parent_email?.trim().toLowerCase() || null,
		parent_phone_number: body.parent_phone_number?.trim() || null,
		notes: body.notes?.trim() || null,
		sepa_iban: sepa.sepaIban,
		sepa_account_holder: sepa.sepaHolder,
		sepa_bic: sepa.sepaBic,
		status: 'pending' as const,
	};
}
