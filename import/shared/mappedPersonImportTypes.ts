/** Shared mapped address/contact fields for student and teacher Mongo import rows. */
export type MappedPersonImportRowBase = {
	mongoOid: string;
	/** Real/missing login email for owners; null for shared-login members. */
	email: string | null;
	/** `owner` | `shared_member` | `missing` from shared `allocateImportEmail`. */
	emailKind: 'owner' | 'shared_member' | 'missing';
	/** From shared `allocateImportEmail` (missing / shared member); includes context. */
	emailWarning: string | null;
	firstName: string | null;
	lastName: string | null;
	phoneNumber: string | null;
	streetName: string | null;
	/** House number including any addition (e.g. 12A). */
	houseNumber: string | null;
	postalCode: string | null;
	city: string | null;
	/** ISO 3166-1 alpha-2; defaults to NL. */
	countryCode: string;
	/** Set when country was present but not a valid ISO 3166-1 alpha-2 code. */
	invalidCountryCode: string | null;
};
