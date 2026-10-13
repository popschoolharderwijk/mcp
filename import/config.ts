/** Fixed paths for legacy Mongo import converters. */

export const IMPORT_SOURCE_DIR = 'import/source';
export const IMPORT_OUT_DIR = 'import/out';

export const IMPORT_ID_MAP_PATH = `${IMPORT_OUT_DIR}/id-map.json`;

export const IMPORT_SOURCES = {
	teachers: ['teachers.jsonl'],
	courses: ['courses.json', 'schedule_frequencies.jsonl'],
} as const;

export const IMPORT_OUTPUTS = {
	teachers: 'teachers.sql',
	courses: 'courses.sql',
} as const;

export type ImportConverterName = keyof typeof IMPORT_SOURCES;
