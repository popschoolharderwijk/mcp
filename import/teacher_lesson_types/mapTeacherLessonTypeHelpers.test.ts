import { beforeEach, describe, expect, it } from 'bun:test';
import { createEmptyIdMap, setMappedId } from '../shared/idMapHelpers';
import { buildKnownTeacherOidSet, mapTeacherLessonTypeDoc, setKnownTeacherOids } from './mapTeacherLessonTypeHelpers';

const TEACHER_OID = 'teacher-oid';
const COURSE_OID = 'course-oid';
const AGREEMENT_OID = 'agreement-oid';

function baseIdMap() {
	let map = createEmptyIdMap();
	map = setMappedId(map, 'teacher', TEACHER_OID, 'teacher-uuid');
	map = setMappedId(map, 'lesson_type', COURSE_OID, 'lesson-type-uuid');
	return map;
}

describe('buildKnownTeacherOidSet', () => {
	it('collects teacher oids from teacher docs', () => {
		expect(
			buildKnownTeacherOidSet([
				{ _id: { $oid: 't-1' } },
				{ _id: { $oid: 't-2' } },
				null,
				{ _id: 'plain-oid' },
				{ _id: '' },
			]),
		).toEqual(new Set(['t-1', 't-2', 'plain-oid']));
	});
});

describe('mapTeacherLessonTypeDoc', () => {
	beforeEach(() => {
		setKnownTeacherOids(new Set([TEACHER_OID]));
	});

	it('maps teacher and course oids onto a composite link row', () => {
		const result = mapTeacherLessonTypeDoc(
			{
				_id: { $oid: AGREEMENT_OID },
				teacher: { $oid: TEACHER_OID },
				course: { $oid: COURSE_OID },
				student: { $oid: 'student-oid' },
			},
			baseIdMap(),
		);
		expect(result).toEqual({
			ok: true,
			row: {
				mongoOid: `${TEACHER_OID}:${COURSE_OID}`,
				teacherUserId: 'teacher-uuid',
				lessonTypeId: 'lesson-type-uuid',
			},
		});
	});

	it('fails when the teacher is missing from teachers.jsonl or id-map', () => {
		setKnownTeacherOids(new Set());
		expect(
			mapTeacherLessonTypeDoc(
				{
					_id: { $oid: AGREEMENT_OID },
					teacher: { $oid: TEACHER_OID },
					course: { $oid: COURSE_OID },
				},
				baseIdMap(),
			).ok,
		).toBe(false);

		setKnownTeacherOids(new Set([TEACHER_OID]));
		expect(
			mapTeacherLessonTypeDoc(
				{
					_id: { $oid: AGREEMENT_OID },
					teacher: { $oid: TEACHER_OID },
					course: { $oid: COURSE_OID },
				},
				createEmptyIdMap(),
			).ok,
		).toBe(false);
	});
});
