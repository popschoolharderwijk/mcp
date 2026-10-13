import { normalizeCompactTextOrNull, normalizeTrimmedTextOrNull } from '../../src/lib/text/normalizeText';
import { classifySourceKeys, type SourceKeyClassification } from '../shared/classifySourceKeysHelpers';
import { normalizeIsoDate } from '../shared/dateHelpers';
import {
	allocateImportEmail,
	createImportEmailDedupState,
	type ImportEmailDedupState,
	keepExistingImportEmail,
} from '../shared/importEmailHelpers';
import {
	asOptionalString,
	asOptionalStringOrNumber,
	combineHouseNumber,
	normalizeIsoCountryCode,
} from '../shared/mapPersonFieldHelpers';
import { extractMongoOid } from '../shared/parseMongoExportHelpers';
import { normalizeDutchMobilePhone } from '../shared/phoneHelpers';
import type { MappedStudentRow, MongoStudentDoc, StudentMapResult } from './types';

/** Mongo keys that `mapStudentDoc` reads into the import. */
export const MAPPED_KEYS = new Set([
	'_id',
	'name',
	'surname',
	'email',
	'phone',
	'birthday',
	'street',
	'houseno',
	'housenoadd',
	'zip',
	'city',
	'country',
]);

/** Known Mongo keys that we intentionally do not import. */
export const IGNORED_KEYS = new Set(['studentnumber', 'orgdebnumber', 'comments']);

export type StudentKeyClassification = SourceKeyClassification;

/** Default state for unit tests; profiles passes a shared batch state. */
let emailDedupState: ImportEmailDedupState = createImportEmailDedupState();

/** Clear module email dedup state before converting in isolation (tests). */
export function resetStudentEmailDedup(): void {
	emailDedupState = createImportEmailDedupState();
}

/** Classify unmapped student keys into unexpected (skipped) vs intentionally ignored. */
export function classifyStudentKeys(doc: object): StudentKeyClassification {
	return classifySourceKeys(doc, MAPPED_KEYS, IGNORED_KEYS);
}

/** Convert mapped-row soft issues into import-report warning reasons. */
export function studentRowWarningReasons(row: MappedStudentRow): string[] {
	const reasons: string[] = [];
	if (row.emailWarning != null) {
		reasons.push(row.emailWarning);
	}
	if (row.invalidDateOfBirth) {
		reasons.push(`Invalid birthday "${row.invalidDateOfBirth}" (expected YYYY-MM-DD)`);
	}
	if (row.invalidCountryCode) {
		reasons.push(`Invalid country "${row.invalidCountryCode}" (expected ISO 3166-1 alpha-2)`);
	}
	return reasons;
}

export type MapStudentDocOptions = {
	/** Keep source email (no duplicate_N_); same name+email as an existing profile. */
	keepExistingEmail?: boolean;
};

export function mapStudentDoc(
	doc: unknown,
	emailState: ImportEmailDedupState = emailDedupState,
	options?: MapStudentDocOptions,
): StudentMapResult {
	if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
		return { ok: false, oid: null, reason: 'Document is not an object' };
	}

	const student = doc as MongoStudentDoc;
	const mongoOid = extractMongoOid(student._id);
	if (!mongoOid) {
		return { ok: false, oid: null, reason: 'Missing _id.$oid' };
	}

	const rawEmail = normalizeTrimmedTextOrNull(asOptionalString(student.email));
	const allocated =
		options?.keepExistingEmail && rawEmail != null
			? keepExistingImportEmail(emailState, rawEmail)
			: allocateImportEmail(emailState, rawEmail, mongoOid);

	const rawDateOfBirth = asOptionalString(student.birthday);
	const dateOfBirth = normalizeIsoDate(rawDateOfBirth);
	const invalidDateOfBirth =
		rawDateOfBirth != null && rawDateOfBirth.trim() !== '' && dateOfBirth === null ? rawDateOfBirth.trim() : null;

	const { countryCode, invalidCountryCode } = normalizeIsoCountryCode(asOptionalString(student.country));

	const row: MappedStudentRow = {
		mongoOid,
		email: allocated.email,
		emailWarning: allocated.warning,
		firstName: normalizeCompactTextOrNull(asOptionalString(student.name)),
		lastName: normalizeCompactTextOrNull(asOptionalString(student.surname)),
		phoneNumber: normalizeDutchMobilePhone(asOptionalString(student.phone)),
		streetName: normalizeCompactTextOrNull(asOptionalString(student.street)),
		houseNumber: combineHouseNumber(
			asOptionalStringOrNumber(student.houseno),
			asOptionalStringOrNumber(student.housenoadd),
		),
		postalCode: normalizeCompactTextOrNull(asOptionalStringOrNumber(student.zip)),
		city: normalizeCompactTextOrNull(asOptionalString(student.city)),
		countryCode,
		dateOfBirth,
		invalidDateOfBirth,
		invalidCountryCode,
	};

	return { ok: true, row };
}
