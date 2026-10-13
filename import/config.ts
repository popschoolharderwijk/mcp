/** Fixed paths for legacy Mongo import converters. */

export const IMPORT_SOURCE_DIR = 'import/source';
export const IMPORT_OUT_DIR = 'import/out';

export const IMPORT_ID_MAP_PATH = `${IMPORT_OUT_DIR}/id-map.json`;
export const IMPORT_LOG_PATH = `${IMPORT_OUT_DIR}/import.log`;

export const IMPORT_SOURCES = {
	courses: ['courses.json', 'schedule_frequencies.jsonl'],
	teachers: ['teachers.jsonl'],
	students: ['students.jsonl'],
	agreements_courses: ['agreements_course.jsonl', 'schedule_frequencies.jsonl', 'courses.json'],
} as const;

export const IMPORT_OUTPUTS = {
	courses: 'courses.sql',
	teachers: 'teachers.sql',
	students: 'students.sql',
	agreements_courses: 'agreements_courses.sql',
} as const;

export type ImportConverterName = keyof typeof IMPORT_SOURCES;
