import {
	emptyProfileAddressForm,
	getProfileAddressValidationError,
	profileAddressFormFromFields,
} from '@/lib/profile/profileAddressHelpers';
import type { ProfileAddressFields, ProfileAddressFormState } from '@/types/profile-address';

export type ProfileAddressBootstrap = {
	hasInitial: boolean;
	form: ProfileAddressFormState;
	loading: boolean;
};

/** Initial local form state from optional parent address fields. */
export function resolveProfileAddressBootstrap(
	initialAddress?: Partial<ProfileAddressFields> | null,
): ProfileAddressBootstrap {
	const hasInitial = initialAddress != null;
	return {
		hasInitial,
		form: hasInitial ? profileAddressFormFromFields(initialAddress) : emptyProfileAddressForm,
		loading: !hasInitial,
	};
}

/** Stable primitive key so referential-only parent object churn does not reset the form. */
export function profileAddressValueKey(initialAddress?: Partial<ProfileAddressFields> | null): string | null {
	if (initialAddress == null) return null;
	return [
		initialAddress.street_name ?? '',
		initialAddress.house_number ?? '',
		initialAddress.postal_code ?? '',
		initialAddress.city ?? '',
		initialAddress.country_code ?? '',
	].join('\u0001');
}

/** Rebuild form fields from a value key produced by `profileAddressValueKey`. */
export function profileAddressFormFromValueKey(key: string): ProfileAddressFormState {
	const [street_name, house_number, postal_code, city, country_code] = key.split('\u0001');
	return profileAddressFormFromFields({
		street_name,
		house_number,
		postal_code,
		city,
		country_code,
	});
}

export type ProfileAddressSaveBlock = { blocked: true; message: string } | { blocked: false };

/** Toast when address save should be blocked; null when validation passes. */
export function resolveProfileAddressSaveBlock(form: ProfileAddressFormState): ProfileAddressSaveBlock {
	const message = getProfileAddressValidationError(form);
	if (message) return { blocked: true, message };
	return { blocked: false };
}

/** Address fields from a profile-like row (defaults country to NL). */
export function profileAddressFieldsFromRow(row: {
	street_name?: string | null;
	house_number?: string | null;
	postal_code?: string | null;
	city?: string | null;
	country_code?: string | null;
}): ProfileAddressFields {
	return {
		street_name: row.street_name ?? null,
		house_number: row.house_number ?? null,
		postal_code: row.postal_code ?? null,
		city: row.city ?? null,
		country_code: row.country_code ?? 'NL',
	};
}
