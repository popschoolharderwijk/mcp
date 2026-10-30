import type { MapDocResult } from '../shared/converterTypes';
import type { MappedPersonImportRowBase } from '../shared/mappedPersonImportTypes';

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

export type MappedTeacherRow = MappedPersonImportRowBase & {
	/** Certificate of Conduct issue date `YYYY-MM-DD`, or null. */
	cocIssuedOn: string | null;
	/** Set when vogdateissued was present but not a valid YYYY-MM-DD date. */
	invalidCocIssuedOn: string | null;
	/** Set when country was present but not a valid ISO 3166-1 alpha-2 code. */
	invalidCountryCode: string | null;
};

export type TeacherMapResult = MapDocResult<MappedTeacherRow>;
