import {
	emptyProfileAddressForm,
	getProfileAddressValidationError,
	profileAddressFormFromFields,
} from '@/lib/profile/profileAddressHelpers';
import type { ProfileAddressFields, ProfileAddressFormState } from '@/types/profile-address';

export type TeacherAddressBootstrap = {
	hasInitial: boolean;
	form: ProfileAddressFormState;
	loading: boolean;
};

/** Initial local form state from optional parent address fields. */
export function resolveTeacherAddressBootstrap(
	initialAddress?: Partial<ProfileAddressFields> | null,
): TeacherAddressBootstrap {
	const hasInitial = initialAddress != null;
	return {
		hasInitial,
		form: hasInitial ? profileAddressFormFromFields(initialAddress) : emptyProfileAddressForm,
		loading: !hasInitial,
	};
}

/** Stable primitive key so referential-only parent object churn does not reset the form. */
export function teacherAddressValueKey(initialAddress?: Partial<ProfileAddressFields> | null): string | null {
	if (initialAddress == null) return null;
	return [
		initialAddress.street_name ?? '',
		initialAddress.house_number ?? '',
		initialAddress.postal_code ?? '',
		initialAddress.city ?? '',
		initialAddress.country_code ?? '',
	].join('\u0001');
}

/** Rebuild form fields from a value key produced by `teacherAddressValueKey`. */
export function teacherAddressFormFromValueKey(key: string): ProfileAddressFormState {
	const [street_name, house_number, postal_code, city, country_code] = key.split('\u0001');
	return profileAddressFormFromFields({
		street_name,
		house_number,
		postal_code,
		city,
		country_code,
	});
}

export type TeacherAddressSaveBlock = { blocked: true; message: string } | { blocked: false };

/** Toast when address save should be blocked; null when validation passes. */
export function resolveTeacherAddressSaveBlock(form: ProfileAddressFormState): TeacherAddressSaveBlock {
	const message = getProfileAddressValidationError(form);
	if (message) return { blocked: true, message };
	return { blocked: false };
}
