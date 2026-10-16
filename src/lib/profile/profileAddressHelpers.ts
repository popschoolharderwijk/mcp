import { isValidNlPostalCode, normalizeNlPostalCodeOrNull } from '@/lib/profile/nlPostalCodeHelpers';
import { normalizeCompactText, normalizeCompactTextOrNull, normalizeTrimmedText } from '@/lib/text/normalizeText';
import type { ProfileAddressFields, ProfileAddressFormState } from '@/types/profile-address';

export const DEFAULT_COUNTRY_CODE = 'NL';

export const emptyProfileAddressForm: ProfileAddressFormState = {
	street_name: '',
	house_number: '',
	postal_code: '',
	city: '',
	country_code: DEFAULT_COUNTRY_CODE,
};

export const PROFILE_ADDRESS_SELECT = 'street_name, house_number, postal_code, city, country_code';

export function profileAddressFormFromFields(
	fields: Partial<ProfileAddressFields> | null | undefined,
): ProfileAddressFormState {
	return {
		street_name: normalizeCompactText(fields?.street_name ?? ''),
		house_number: normalizeCompactText(fields?.house_number ?? ''),
		postal_code: normalizeCompactText(fields?.postal_code ?? ''),
		city: normalizeCompactText(fields?.city ?? ''),
		country_code: normalizeCountryCode(fields?.country_code),
	};
}

/** Blank / missing → NL; otherwise uppercase trimmed ISO code. */
export function normalizeCountryCode(value: string | null | undefined): string {
	if (value == null) return DEFAULT_COUNTRY_CODE;
	const trimmed = normalizeTrimmedText(value);
	if (!trimmed) return DEFAULT_COUNTRY_CODE;
	return trimmed.toUpperCase();
}

export function buildProfileAddressUpdateFields(form: ProfileAddressFormState): ProfileAddressFields {
	const country_code = normalizeCountryCode(form.country_code);
	const postal_code =
		country_code === 'NL'
			? normalizeNlPostalCodeOrNull(form.postal_code)
			: normalizeCompactTextOrNull(form.postal_code);

	return {
		street_name: normalizeCompactTextOrNull(form.street_name),
		house_number: normalizeCompactTextOrNull(form.house_number),
		postal_code,
		city: normalizeCompactTextOrNull(form.city),
		country_code,
	};
}

/** Landcode defaults to NL; when set it must be ISO 3166-1 alpha-2. NL postcodes are validated. */
export function getProfileAddressValidationError(form: ProfileAddressFormState): string | null {
	const code = normalizeTrimmedText(form.country_code);
	if (code && !/^[A-Za-z]{2}$/.test(code)) {
		return 'Landcode moet uit 2 letters bestaan (ISO 3166-1 alpha-2)';
	}

	const country_code = normalizeCountryCode(form.country_code);
	if (country_code === 'NL' && !isValidNlPostalCode(form.postal_code)) {
		return 'Postcode moet 4 cijfers zijn, optioneel gevolgd door 2 letters (bijv. 1234AB)';
	}

	return null;
}
