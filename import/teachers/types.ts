import type { BootstrapLessonTypeName } from './instrumentLessonTypeHelpers';

export type MongoTeacherDoc = {
	_id?: unknown;
	name?: unknown;
	surname?: unknown;
	email?: unknown;
	phone?: unknown;
	instrument?: unknown;
	vogdateissued?: unknown;
	street?: unknown;
	houseno?: unknown;
	housenoadd?: unknown;
	zip?: unknown;
	city?: unknown;
	country?: unknown;
	assets?: unknown;
	user?: unknown;
	[key: string]: unknown;
};

export type MappedTeacherRow = {
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
	/** Certificate of Conduct issue date `YYYY-MM-DD`, or null. */
	cocIssuedOn: string | null;
	lessonTypeNames: BootstrapLessonTypeName[];
	unmatchedInstruments: string[];
	/** Set when vogdateissued was present but not a valid YYYY-MM-DD date. */
	invalidCocIssuedOn: string | null;
	/** Set when country was present but not a valid ISO 3166-1 alpha-2 code. */
	invalidCountryCode: string | null;
};

export type TeacherMapResult = { ok: true; row: MappedTeacherRow } | { ok: false; oid: string | null; reason: string };
