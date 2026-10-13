import type { ImportConverterName } from './config';
import { coursesConverter } from './courses/converter';
import type { ImportConverter } from './shared/converterTypes';
import { studentsConverter } from './students/converter';
import { teachersConverter } from './teachers/converter';

/** Registry of Mongo → SQL converters. Add new converters here. */
export const IMPORT_CONVERTERS: Record<ImportConverterName, ImportConverter> = {
	teachers: teachersConverter,
	courses: coursesConverter,
	students: studentsConverter,
};

export const IMPORT_CONVERTER_NAMES = Object.keys(IMPORT_CONVERTERS) as ImportConverterName[];
