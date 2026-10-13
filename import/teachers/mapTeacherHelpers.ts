import { normalizeCompactTextOrNull, normalizeTrimmedTextOrNull } from '../../src/lib/text/normalizeText';
import { classifySourceKeys, type SourceKeyClassification } from '../shared/classifySourceKeysHelpers';
import { normalizeIsoDate } from '../shared/dateHelpers';
import {
	allocateImportEmail,
	createImportEmailDedupState,
	type ImportEmailDedupState,
} from '../shared/importEmailHelpers';
import {
	asOptionalString,
	asOptionalStringOrNumber,
	combineHouseNumber,
	normalizeIsoCountryCode,
} from '../shared/mapPersonFieldHelpers';
import { extractMongoOid } from '../shared/parseMongoExportHelpers';
import { normalizeDutchMobilePhone } from '../shared/phoneHelpers';
import type { MappedTeacherRow, MongoTeacherDoc, TeacherMapResult } from './types';

/** Mongo keys that `mapTeacherDoc` reads into the import. */
export const MAPPED_KEYS = new Set([
	'_id',
	'name',
	'surname',
	'email',
	'phone',
	'vogdateissued',
	'street',
	'houseno',
	'housenoadd',
	'zip',
	'city',
	'country',
]);

/** Known Mongo keys that we intentionally do not import. */
export const IGNORED_KEYS = new Set(['assets', 'comments', 'instrument', 'note_to_teacher', 'user', 'vog']);

export type TeacherKeyClassification = SourceKeyClassification;

let emailDedupState: ImportEmailDedupState = createImportEmailDedupState();

/** Clear in-batch email dedup state before converting a source file. */
export function resetTeacherEmailDedup(): void {
	emailDedupState = createImportEmailDedupState();
}

/** Classify unmapped teacher keys into unexpected (skipped) vs intentionally ignored. */
export function classifyTeacherKeys(doc: object): TeacherKeyClassification {
	return classifySourceKeys(doc, MAPPED_KEYS, IGNORED_KEYS);
}

/** Convert mapped-row soft issues into import-report warning reasons. */
export function teacherRowWarningReasons(row: MappedTeacherRow): string[] {
	const reasons: string[] = [];
	if (row.emailWarning != null) {
		reasons.push(row.emailWarning);
	}
	if (row.invalidCocIssuedOn) {
		reasons.push(`Invalid vogdateissued "${row.invalidCocIssuedOn}" (expected YYYY-MM-DD)`);
	}
	if (row.invalidCountryCode) {
		reasons.push(`Invalid country "${row.invalidCountryCode}" (expected ISO 3166-1 alpha-2)`);
	}
	return reasons;
}

export function mapTeacherDoc(doc: unknown): TeacherMapResult {
	if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
		return { ok: false, oid: null, reason: 'Document is not an object' };
	}

	const teacher = doc as MongoTeacherDoc;
	const mongoOid = extractMongoOid(teacher._id);
	if (!mongoOid) {
		return { ok: false, oid: null, reason: 'Missing _id.$oid' };
	}

	const allocated = allocateImportEmail(
		emailDedupState,
		normalizeTrimmedTextOrNull(asOptionalString(teacher.email)),
		mongoOid,
	);

	const rawCocIssuedOn = asOptionalString(teacher.vogdateissued);
	const cocIssuedOn = normalizeIsoDate(rawCocIssuedOn);
	const invalidCocIssuedOn =
		rawCocIssuedOn != null && rawCocIssuedOn.trim() !== '' && cocIssuedOn === null ? rawCocIssuedOn.trim() : null;

	const { countryCode, invalidCountryCode } = normalizeIsoCountryCode(asOptionalString(teacher.country));

	const row: MappedTeacherRow = {
		mongoOid,
		email: allocated.email,
		emailWarning: allocated.warning,
		firstName: normalizeCompactTextOrNull(asOptionalString(teacher.name)),
		lastName: normalizeCompactTextOrNull(asOptionalString(teacher.surname)),
		phoneNumber: normalizeDutchMobilePhone(asOptionalString(teacher.phone)),
		streetName: normalizeCompactTextOrNull(asOptionalString(teacher.street)),
		houseNumber: combineHouseNumber(
			asOptionalStringOrNumber(teacher.houseno),
			asOptionalStringOrNumber(teacher.housenoadd),
		),
		postalCode: normalizeCompactTextOrNull(asOptionalStringOrNumber(teacher.zip)),
		city: normalizeCompactTextOrNull(asOptionalString(teacher.city)),
		countryCode,
		cocIssuedOn,
		invalidCocIssuedOn,
		invalidCountryCode,
	};

	return { ok: true, row };
}
