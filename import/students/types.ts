import type { MapDocResult } from '../shared/converterTypes';

export type MongoStudentDoc = {
	_id?: unknown;
	name?: unknown;
	surname?: unknown;
	email?: unknown;
	phone?: unknown;
	birthday?: unknown;
	street?: unknown;
	houseno?: unknown;
	housenoadd?: unknown;
	zip?: unknown;
	city?: unknown;
	country?: unknown;
	studentnumber?: unknown;
	orgdebnumber?: unknown;
	comments?: unknown;
	[key: string]: unknown;
};

export type MappedStudentRow = {
	mongoOid: string;
	email: string;
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
	/** Date of birth `YYYY-MM-DD`, or null. */
	dateOfBirth: string | null;
	/** Set when birthday was present but not a valid YYYY-MM-DD date. */
	invalidDateOfBirth: string | null;
	/** Set when country was present but not a valid ISO 3166-1 alpha-2 code. */
	invalidCountryCode: string | null;
};

export type StudentMapResult = MapDocResult<MappedStudentRow>;
