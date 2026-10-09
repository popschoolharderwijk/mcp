/**
 * Residential address on public.profiles.
 * Prefer Pick<Tables<'profiles'>, …> after `bun run db:reset` regenerates types.
 */
export type ProfileAddressFields = {
	street_name: string | null;
	house_number: string | null;
	postal_code: string | null;
	city: string | null;
	country_code: string;
};

export type ProfileAddressFormState = {
	street_name: string;
	house_number: string;
	postal_code: string;
	city: string;
	country_code: string;
};
