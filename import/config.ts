/** Filenames and converter wiring for legacy Mongo import. */

export const IMPORT_ID_MAP_FILE = 'id-map.json';
export const IMPORT_LOG_FILE = 'import.log';
/** Per-run options; loaded from `<source>/settings.json` (see `import/settings.json` example). */
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
	courses: ['courses.json', 'schedule_frequencies.jsonl'],
	profiles: ['teachers.jsonl', 'students.jsonl'],
	students: ['students.jsonl'],
	teachers: ['teachers.jsonl'],
	teacher_lesson_types: ['agreements_course.jsonl', 'teachers.jsonl', 'schedule_frequencies.jsonl'],
	agreements_courses: ['agreements_course.jsonl', 'schedule_frequencies.jsonl', 'courses.json'],
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
