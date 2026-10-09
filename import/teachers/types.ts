import type { BootstrapLessonTypeName } from './instrumentLessonTypeHelpers';

export type MongoTeacherDoc = {
	_id?: unknown;
	name?: unknown;
	surname?: unknown;
	email?: unknown;
	phone?: unknown;
	instrument?: unknown;
	note_to_teacher?: unknown;
	comments?: unknown;
	assets?: unknown;
	user?: unknown;
	[key: string]: unknown;
};

export type MappedTeacherRow = {
	mongoOid: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
	phoneNumber: string | null;
	bio: string | null;
	lessonTypeNames: BootstrapLessonTypeName[];
	unmatchedInstruments: string[];
};

export type TeacherMapResult = { ok: true; row: MappedTeacherRow } | { ok: false; oid: string | null; reason: string };
