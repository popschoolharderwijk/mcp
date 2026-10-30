/** Filenames and converter wiring for legacy Mongo import. */

export const IMPORT_ID_MAP_FILE = 'id-map.json';
/** Relative directory under the import out dir for per-section severity logs. */
export const IMPORT_LOG_DIR = 'log';
/** Log section slug for agreement/student cutoff removals (`import_cutoff.info.log`). */
export const IMPORT_CUTOFF_LOG_SECTION = 'import_cutoff';
export const IMPORT_LOG_SEVERITIES = ['error', 'warning', 'info'] as const;
export type ImportLogSeverity = (typeof IMPORT_LOG_SEVERITIES)[number];
/** Tool options; loaded from `import/settings.json` next to this package. */
export const IMPORT_SETTINGS_FILE = 'settings.json';

/**
 * Pipeline order (dependency order):
 * 1. courses — lesson types + options
 * 2. profiles — auth.users + public.profiles (teachers+students sources, deduped)
 * 3. students — public.students role rows
 * 4. teachers — public.teachers role rows
 * 5. teacher_lesson_types — needs teacher + lesson_type ids
 * 6. agreements_courses — needs student, teacher, lesson_type ids
 */
export const IMPORT_SOURCES = {
	courses: ['courses.jsonl', 'schedule_frequencies.jsonl'],
	profiles: ['teachers.jsonl', 'students.jsonl'],
	students: ['students.jsonl'],
	teachers: ['teachers.jsonl'],
	teacher_lesson_types: ['agreements_course.jsonl', 'teachers.jsonl', 'schedule_frequencies.jsonl'],
	agreements_courses: [
		'agreements_course.jsonl',
		'schedule_frequencies.jsonl',
		'courses.jsonl',
		'c4s_agenda_events.jsonl',
		'teachers.jsonl',
		'students.jsonl',
	],
} as const;

export const IMPORT_OUTPUTS = {
	courses: 'courses.sql',
	profiles: 'profiles.sql',
	students: 'students.sql',
	teachers: 'teachers.sql',
	teacher_lesson_types: 'teacher_lesson_types.sql',
	agreements_courses: 'agreements_courses.sql',
} as const;

export type ImportConverterName = keyof typeof IMPORT_SOURCES;

type TupleTail<T extends readonly unknown[]> = T extends readonly [unknown, ...infer Rest] ? Rest : [];

/** Source filenames after the primary file for a converter. */
export type ImportExtraSourceFiles<N extends ImportConverterName> = TupleTail<(typeof IMPORT_SOURCES)[N]>;

/** Parsed Mongo docs keyed by extra source filename from `IMPORT_SOURCES`. */
export type ImportExtraDocs<N extends ImportConverterName> = {
	readonly [K in ImportExtraSourceFiles<N>[number]]: unknown[];
};
