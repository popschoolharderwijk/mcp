import type { ImportConverterName } from './config';
import { coursesConverter } from './courses/converter';
import type { ImportConverter } from './shared/converterTypes';
import { teachersConverter } from './teachers/converter';

/** Registry of Mongo → SQL converters. Add new converters here. */
export const IMPORT_CONVERTERS: Record<ImportConverterName, ImportConverter> = {
	// Erased at the registry boundary; each converter keeps its concrete row types internally.
	teachers: teachersConverter as ImportConverter,
	courses: coursesConverter as ImportConverter,
};

export const IMPORT_CONVERTER_NAMES = Object.keys(IMPORT_CONVERTERS) as ImportConverterName[];
