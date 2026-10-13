import { agreementsCoursesConverter } from './agreements_courses/converter';
import type { ImportConverterName } from './config';
import { coursesConverter } from './courses/converter';
import type { ImportConverter } from './shared/converterTypes';
import { studentsConverter } from './students/converter';
import { teachersConverter } from './teachers/converter';

/** Registry of Mongo → SQL converters. Add new converters here. */
export const IMPORT_CONVERTERS: Record<ImportConverterName, ImportConverter> = {
	courses: coursesConverter,
	teachers: teachersConverter,
	students: studentsConverter,
	agreements_courses: agreementsCoursesConverter,
};

export const IMPORT_CONVERTER_NAMES = Object.keys(IMPORT_CONVERTERS) as ImportConverterName[];
