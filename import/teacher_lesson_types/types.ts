import type { MapDocResult, MappedImportRow } from '../shared/converterTypes';

/** One teacher ↔ lesson-type link derived from an agreements_course row. */
export type MappedTeacherLessonTypeRow = MappedImportRow & {
	teacherUserId: string;
	lessonTypeId: string;
};

export type TeacherLessonTypeSqlRow = MappedTeacherLessonTypeRow;

export type TeacherLessonTypeMapResult = MapDocResult<MappedTeacherLessonTypeRow>;
