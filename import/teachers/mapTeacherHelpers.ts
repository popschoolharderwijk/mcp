import { normalizeCompactTextOrNull, normalizeTrimmedTextOrNull } from '../../src/lib/text/normalizeText';
import { extractMongoOid } from '../shared/parseMongoExportHelpers';
import { normalizeDutchMobilePhone } from '../shared/phoneHelpers';
import { mapInstrumentToLessonTypes } from './instrumentLessonTypeHelpers';
import type { MappedTeacherRow, MongoTeacherDoc, TeacherMapResult } from './types';

function asOptionalString(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	return value;
}

function buildBio(noteToTeacher: string | null, comments: string | null): string | null {
	const parts = [normalizeTrimmedTextOrNull(noteToTeacher), normalizeTrimmedTextOrNull(comments)].filter(
		(part): part is string => part != null,
	);
	if (parts.length === 0) return null;
	return parts.join('\n');
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

	const row: MappedTeacherRow = {
		mongoOid,
		email,
		firstName: normalizeCompactTextOrNull(asOptionalString(teacher.name)),
		lastName: normalizeCompactTextOrNull(asOptionalString(teacher.surname)),
		phoneNumber: normalizeDutchMobilePhone(asOptionalString(teacher.phone)),
		bio: buildBio(asOptionalString(teacher.note_to_teacher), asOptionalString(teacher.comments)),
		lessonTypeNames: instrumentMatch.lessonTypeNames,
		unmatchedInstruments: instrumentMatch.unmatchedTokens,
	};

	return { ok: true, row };
}
