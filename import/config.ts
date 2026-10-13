/** Fixed paths for legacy Mongo import converters. */

export const IMPORT_ID_MAP_PATH = 'import/out/id-map.json';

export const IMPORT_SOURCES = {
	teachers: 'import/source/teachers.jsonl',
} as const;

export const IMPORT_OUTPUTS = {
	teachers: 'import/out/teachers.sql',
} as const;

export type ImportConverterName = keyof typeof IMPORT_SOURCES;
