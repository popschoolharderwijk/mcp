import { describe, expect, it } from 'bun:test';
import { buildImportBatch } from '../shared/buildImportBatchHelpers';
import { createEmptyIdMap, setMappedId } from '../shared/idMapHelpers';
import { emptyImportExtraDocs } from '../shared/importExtraDocsHelpers';
import { teacherLessonTypesConverter } from './converter';

describe('teacherLessonTypesConverter', () => {
	it('builds unique links from agreements using teachers.jsonl and the id-map', () => {
		teacherLessonTypesConverter.prepareContext?.({
			...emptyImportExtraDocs('teacher_lesson_types'),
			'teachers.jsonl': [{ _id: { $oid: 'teacher-1' } }, { _id: { $oid: 'teacher-2' } }],
		});

		let idMap = createEmptyIdMap();
		idMap = setMappedId(idMap, 'teacher', 'teacher-1', 'teacher-uuid-1');
		idMap = setMappedId(idMap, 'teacher', 'teacher-2', 'teacher-uuid-2');
		idMap = setMappedId(idMap, 'lesson_type', 'course-1', 'lesson-type-uuid-1');
		idMap = setMappedId(idMap, 'lesson_type', 'course-2', 'lesson-type-uuid-2');

		const batch = buildImportBatch(
			[
				{
					_id: { $oid: 'a-1' },
					teacher: { $oid: 'teacher-1' },
					course: { $oid: 'course-1' },
					student: { $oid: 'student-1' },
				},
				{
					_id: { $oid: 'a-2' },
					teacher: { $oid: 'teacher-1' },
					course: { $oid: 'course-1' },
					student: { $oid: 'student-2' },
				},
				{
					_id: { $oid: 'a-3' },
					teacher: { $oid: 'teacher-2' },
					course: { $oid: 'course-2' },
				},
			],
			teacherLessonTypesConverter,
			idMap,
			() => 'link-uuid',
		);

		expect(batch.report.created).toBe(2);
		expect(batch.report.updated).toBe(1);
		expect(batch.report.failed).toBe(0);
		const sql = teacherLessonTypesConverter.buildSql(batch.sqlRows);
		expect(sql).toContain('teacher-uuid-1');
		expect(sql).toContain('lesson-type-uuid-1');
		expect(sql).toContain('teacher-uuid-2');
		expect(sql).toContain('lesson-type-uuid-2');
	});
});
