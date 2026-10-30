import { beforeEach, describe, expect, it } from 'bun:test';
import { createEmptyIdMap, getMappedId } from '../shared/idMapHelpers';
import { resetImportRuntimeSettings, setImportSettings } from '../shared/importRuntimeSettingsHelpers';
import { DEFAULT_IMPORT_SETTINGS } from '../shared/importSettingsHelpers';
import { buildCoursesBatch } from './buildCoursesBatchHelpers';
import { setCourseScheduleFrequencyMap } from './mapCourseHelpers';

beforeEach(() => {
	resetImportRuntimeSettings();
	setCourseScheduleFrequencyMap(new Map());
});

describe('buildCoursesBatch', () => {
	it('collapses aliased courses onto one lesson_type uuid and name', () => {
		setImportSettings({
			...DEFAULT_IMPORT_SETTINGS,
			useLessonTypeAliases: true,
			lessonTypeAliases: {
				Muziekclub: ['15 Muziekclub September 2025', '16 Muziekclub November 2025'],
			},
		});

		const batch = buildCoursesBatch(
			[
				{ _id: { $oid: 'course-a' }, name: '15 Muziekclub September 2025', maxparticipants: 8 },
				{ _id: { $oid: 'course-b' }, name: '16 Muziekclub November 2025', maxparticipants: 8 },
			],
			createEmptyIdMap(),
			() => 'shared-lesson-type-uuid',
		);

		expect(batch.report.failed).toBe(0);
		expect(batch.sqlRows).toHaveLength(1);
		expect(batch.sqlRows[0]?.name).toBe('Muziekclub');
		expect(batch.sqlRows[0]?.lessonTypeId).toBe('shared-lesson-type-uuid');
		expect(getMappedId(batch.idMap, 'lesson_type', 'course-a')).toBe('shared-lesson-type-uuid');
		expect(getMappedId(batch.idMap, 'lesson_type', 'course-b')).toBe('shared-lesson-type-uuid');
	});

	it('fails when a course name is missing from lessonTypeAliases', () => {
		setImportSettings({
			...DEFAULT_IMPORT_SETTINGS,
			useLessonTypeAliases: true,
			lessonTypeAliases: { Muziekclub: ['15 Muziekclub September 2025'] },
		});

		const batch = buildCoursesBatch(
			[{ _id: { $oid: 'course-x' }, name: '09 Gitaar', maxparticipants: 1 }],
			createEmptyIdMap(),
		);

		expect(batch.sqlRows).toHaveLength(0);
		expect(batch.report.failed).toBe(1);
		expect(batch.report.failures[0]?.reason).toContain('09 Gitaar');
		expect(batch.report.failures[0]?.reason).toContain('lessonTypeAliases');
	});
});
