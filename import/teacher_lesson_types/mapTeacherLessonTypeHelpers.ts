import { getMappedId, type MongoIdMap } from '../shared/idMapHelpers';
import { extractMongoOid } from '../shared/parseMongoExportHelpers';
import type { TeacherLessonTypeMapResult } from './types';

/** Keys read from agreements_course into this converter. */
export const MAPPED_KEYS = new Set(['_id', 'teacher', 'course']);

/** Agreement fields we intentionally ignore for teacher ↔ lesson-type links. */
export const IGNORED_KEYS = new Set([
	'student',
	'agreementnumber',
	'description',
	'durationfreq',
	'paymenttype',
	'monthlyprice',
	'startdate',
	'comments',
	'schedule',
	'events',
	'processed',
	'extra_costs',
	'debtor',
	'numberoflessons',
	'autorenewal',
	'custom_monthly_price',
	'enddate',
	'funding',
	'haltbilling',
	'noscheduling',
	'teacher_notes',
]);

let knownTeacherOids: Set<string> = new Set();

export function setKnownTeacherOids(oids: Set<string>): void {
	knownTeacherOids = oids;
}

/** Collect Mongo teacher oids from teachers.jsonl docs. */
export function buildKnownTeacherOidSet(teacherDocs: unknown[]): Set<string> {
	const oids = new Set<string>();
	for (const doc of teacherDocs) {
		if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) continue;
		const oid = extractMongoOid((doc as Record<string, unknown>)._id);
		if (oid) oids.add(oid);
	}
	return oids;
}

function mapFail(oid: string | null, reason: string): TeacherLessonTypeMapResult {
	return { ok: false, oid, reason };
}

/**
 * Map one agreements_course doc → teacher ↔ lesson-type link.
 * Composite mongoOid `teacherOid:courseOid` so duplicate agreements collapse in the id-map.
 */
export function mapTeacherLessonTypeDoc(doc: unknown, idMap: MongoIdMap): TeacherLessonTypeMapResult {
	if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
		return mapFail(null, 'Document is not an object');
	}

	const record = doc as Record<string, unknown>;
	const agreementOid = extractMongoOid(record._id);
	const teacherOid = extractMongoOid(record.teacher);
	const courseOid = extractMongoOid(record.course);

	if (!teacherOid) {
		return mapFail(agreementOid, 'Missing teacher oid');
	}
	if (!courseOid) {
		return mapFail(agreementOid, 'Missing course oid');
	}
	if (!knownTeacherOids.has(teacherOid)) {
		return mapFail(agreementOid, `Teacher ${teacherOid} not present in teachers.jsonl`);
	}

	const teacherUserId = getMappedId(idMap, 'teacher', teacherOid);
	if (!teacherUserId) {
		return mapFail(agreementOid, `Missing id-map teacher ${teacherOid}`);
	}
	const lessonTypeId = getMappedId(idMap, 'lesson_type', courseOid);
	if (!lessonTypeId) {
		return mapFail(agreementOid, `Missing id-map lesson_type ${courseOid}`);
	}

	return {
		ok: true,
		row: {
			mongoOid: `${teacherOid}:${courseOid}`,
			teacherUserId,
			lessonTypeId,
		},
	};
}

export function teacherLessonTypeRowWarningReasons(): string[] {
	return [];
}
