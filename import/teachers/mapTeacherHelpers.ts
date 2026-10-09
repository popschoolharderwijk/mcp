import { DEFAULT_COUNTRY_CODE, normalizeCountryCode } from '../../src/lib/profile/profileAddressHelpers';
import { normalizeCompactTextOrNull, normalizeTrimmedTextOrNull } from '../../src/lib/text/normalizeText';
import { normalizeIsoDate } from '../shared/dateHelpers';
import { extractMongoOid } from '../shared/parseMongoExportHelpers';
import { normalizeDutchMobilePhone } from '../shared/phoneHelpers';
import { mapInstrumentToLessonTypes } from './instrumentLessonTypeHelpers';
import type { MappedTeacherRow, MongoTeacherDoc, TeacherMapResult } from './types';

const ISO_COUNTRY_CODE_RE = /^[A-Z]{2}$/;

/** Mongo keys that `mapTeacherDoc` reads into the import. */
const MAPPED_TEACHER_KEYS = new Set([
	'_id',
	'name',
	'surname',
	'email',
	'phone',
	'instrument',
	'vogdateissued',
	'street',
	'houseno',
	'housenoadd',
	'zip',
	'city',
	'country',
]);

/** Known Mongo keys that we intentionally do not import. */
const IGNORED_TEACHER_KEYS = new Set(['assets', 'comments', 'note_to_teacher', 'user', 'vog']);

export type TeacherKeyClassification = {
	skippedKeys: string[];
	ignoredKeys: string[];
};

function asOptionalString(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	return value;
}

/** String or finite number → string; used for house numbers / zip that Mongo may store as numbers. */
function asOptionalStringOrNumber(value: unknown): string | null {
	if (typeof value === 'string') return value;
	if (typeof value === 'number' && Number.isFinite(value)) return String(value);
	return null;
}

/** Trim houseno + housenoadd, then concatenate into a single house_number. */
function combineHouseNumber(number: string | null, addition: string | null): string | null {
	const houseNumber = (number ?? '').trim();
	const houseNumberAddition = (addition ?? '').trim();
	return normalizeCompactTextOrNull(`${houseNumber}${houseNumberAddition}`);
}

function normalizeIsoCountryCode(raw: string | null): {
	countryCode: string;
	invalidCountryCode: string | null;
} {
	if (raw == null || raw.trim() === '') {
		return { countryCode: DEFAULT_COUNTRY_CODE, invalidCountryCode: null };
	}
	const normalized = normalizeCountryCode(raw);
	if (ISO_COUNTRY_CODE_RE.test(normalized)) {
		return { countryCode: normalized, invalidCountryCode: null };
	}
	return { countryCode: DEFAULT_COUNTRY_CODE, invalidCountryCode: raw.trim() };
}

/** Classify unmapped source keys into unexpected (skipped) vs intentionally ignored. */
export function classifyTeacherKeys(doc: object): TeacherKeyClassification {
	const skippedKeys: string[] = [];
	const ignoredKeys: string[] = [];

	for (const key of Object.keys(doc).sort((a, b) => a.localeCompare(b))) {
		if (MAPPED_TEACHER_KEYS.has(key)) continue;
		if (IGNORED_TEACHER_KEYS.has(key)) {
			ignoredKeys.push(key);
			continue;
		}
		skippedKeys.push(key);
	}

	return { skippedKeys, ignoredKeys };
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

	const email = normalizeTrimmedTextOrNull(asOptionalString(teacher.email));
	if (!email) {
		return { ok: false, oid: mongoOid, reason: 'Missing email' };
	}

	const instrumentMatch = mapInstrumentToLessonTypes(asOptionalString(teacher.instrument));
	const rawCocIssuedOn = asOptionalString(teacher.vogdateissued);
	const cocIssuedOn = normalizeIsoDate(rawCocIssuedOn);
	const invalidCocIssuedOn =
		rawCocIssuedOn != null && rawCocIssuedOn.trim() !== '' && cocIssuedOn === null ? rawCocIssuedOn.trim() : null;

	const { countryCode, invalidCountryCode } = normalizeIsoCountryCode(asOptionalString(teacher.country));

	const row: MappedTeacherRow = {
		mongoOid,
		email,
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
		lessonTypeNames: instrumentMatch.lessonTypeNames,
		unmatchedInstruments: instrumentMatch.unmatchedTokens,
		invalidCocIssuedOn,
		invalidCountryCode,
	};

	return { ok: true, row };
}
