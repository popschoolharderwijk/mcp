import { agreementsCoursesConverter } from './agreements_courses/converter';
import type { ImportConverterName } from './config';
import { coursesConverter } from './courses/converter';
import { profilesConverter } from './profiles/converter';
import type { ImportConverter } from './shared/converterTypes';
import { studentsConverter } from './students/converter';
import { teacherLessonTypesConverter } from './teacher_lesson_types/converter';
import { teachersConverter } from './teachers/converter';

/** Registry of Mongo → SQL converters in pipeline order. */
export const IMPORT_CONVERTERS: Record<ImportConverterName, ImportConverter> = {
	courses: coursesConverter,
	profiles: profilesConverter,
	students: studentsConverter,
	teachers: teachersConverter,
	teacher_lesson_types: teacherLessonTypesConverter,
	agreements_courses: agreementsCoursesConverter,
};

export const IMPORT_CONVERTER_NAMES = Object.keys(IMPORT_CONVERTERS) as ImportConverterName[];
