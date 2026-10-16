import { normalizeCompactTextOrNull, normalizeTrimmedTextOrNull } from '../../src/lib/text/normalizeText';
import { classifySourceKeys } from '../shared/classifySourceKeysHelpers';
import type { ImportBatch } from '../shared/converterTypes';
import { getMappedId, type MongoIdMap, setMappedId } from '../shared/idMapHelpers';
import { createImportEmailDedupState, type ImportEmailDedupState } from '../shared/importEmailHelpers';
import { assignSortedReportKeys, recordKeys } from '../shared/importKeySetHelpers';
import { asOptionalString } from '../shared/mapPersonFieldHelpers';
import { createEmptyReport } from '../shared/reportHelpers';
import {
	mapStudentDoc,
	STUDENT_IGNORED_KEYS,
	STUDENT_MAPPED_KEYS,
	studentRowWarningReasons,
} from '../students/mapStudentHelpers';
import type { MappedStudentRow } from '../students/types';
import {
	mapTeacherDoc,
	TEACHER_IGNORED_KEYS,
	TEACHER_MAPPED_KEYS,
	teacherRowWarningReasons,
} from '../teachers/mapTeacherHelpers';
import type { MappedTeacherRow } from '../teachers/types';
import type { ProfileSqlRow } from './types';

/** Trim + lowercase compare key for first+last name. */
function nameKey(firstName: string | null, lastName: string | null): string {
	return `${(firstName ?? '').trim().toLowerCase()}\0${(lastName ?? '').trim().toLowerCase()}`;
}

/** Identity for merge: lowercase trimmed email + name key. */
function identityKey(email: string, firstName: string | null, lastName: string | null): string {
	return `${email.trim().toLowerCase()}\0${nameKey(firstName, lastName)}`;
}

function coalesceNull<T>(existing: T | null, incoming: T | null): T | null {
	return existing ?? incoming;
}

/** Merge roles and fill null profile fields from incoming data. */
function mergeIntoPerson(
	existing: ProfileSqlRow,
	incoming: {
		email: string;
		firstName: string | null;
		lastName: string | null;
		phoneNumber: string | null;
		streetName: string | null;
		houseNumber: string | null;
		postalCode: string | null;
		city: string | null;
		countryCode: string;
		isTeacher?: boolean;
		isStudent?: boolean;
		cocIssuedOn?: string | null;
		dateOfBirth?: string | null;
	},
): ProfileSqlRow {
	return {
		userId: existing.userId,
		email: existing.email,
		firstName: coalesceNull(existing.firstName, incoming.firstName),
		lastName: coalesceNull(existing.lastName, incoming.lastName),
		phoneNumber: coalesceNull(existing.phoneNumber, incoming.phoneNumber),
		streetName: coalesceNull(existing.streetName, incoming.streetName),
		houseNumber: coalesceNull(existing.houseNumber, incoming.houseNumber),
		postalCode: coalesceNull(existing.postalCode, incoming.postalCode),
		city: coalesceNull(existing.city, incoming.city),
		countryCode: existing.countryCode || incoming.countryCode,
		isTeacher: existing.isTeacher || incoming.isTeacher === true,
		isStudent: existing.isStudent || incoming.isStudent === true,
		cocIssuedOn: coalesceNull(existing.cocIssuedOn, incoming.cocIssuedOn ?? null),
		dateOfBirth: coalesceNull(existing.dateOfBirth, incoming.dateOfBirth ?? null),
	};
}

function personFromTeacher(userId: string, row: MappedTeacherRow): ProfileSqlRow {
	return {
		userId,
		email: row.email,
		firstName: row.firstName,
		lastName: row.lastName,
		phoneNumber: row.phoneNumber,
		streetName: row.streetName,
		houseNumber: row.houseNumber,
		postalCode: row.postalCode,
		city: row.city,
		countryCode: row.countryCode,
		isTeacher: true,
		isStudent: false,
		cocIssuedOn: row.cocIssuedOn,
		dateOfBirth: null,
	};
}

function personFromStudent(userId: string, row: MappedStudentRow): ProfileSqlRow {
	return {
		userId,
		email: row.email,
		firstName: row.firstName,
		lastName: row.lastName,
		phoneNumber: row.phoneNumber,
		streetName: row.streetName,
		houseNumber: row.houseNumber,
		postalCode: row.postalCode,
		city: row.city,
		countryCode: row.countryCode,
		isTeacher: false,
		isStudent: true,
		cocIssuedOn: null,
		dateOfBirth: row.dateOfBirth,
	};
}

function peekPersonFields(doc: unknown): {
	rawEmail: string | null;
	firstName: string | null;
	lastName: string | null;
} {
	if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
		return { rawEmail: null, firstName: null, lastName: null };
	}
	const record = doc as Record<string, unknown>;
	return {
		rawEmail: normalizeTrimmedTextOrNull(asOptionalString(record.email)),
		firstName: normalizeCompactTextOrNull(asOptionalString(record.name)),
		lastName: normalizeCompactTextOrNull(asOptionalString(record.surname)),
	};
}

/**
 * Resolve user id for an oid: prefer same name+email identity merge, else reuse oid map, else create.
 * Identity match always wins over a stale oid→uuid from a previous import.
 */
function resolveUserId(params: {
	idMap: MongoIdMap;
	entityType: 'teacher' | 'student';
	mongoOid: string;
	identityUserId: string | undefined;
	createId: () => string;
}): { idMap: MongoIdMap; userId: string; created: boolean } {
	const { entityType, mongoOid, identityUserId, createId } = params;
	let { idMap } = params;

	if (identityUserId != null) {
		const previous = getMappedId(idMap, entityType, mongoOid);
		idMap = setMappedId(idMap, entityType, mongoOid, identityUserId);
		return { idMap, userId: identityUserId, created: previous == null };
	}

	const existing = getMappedId(idMap, entityType, mongoOid);
	if (existing) {
		return { idMap, userId: existing, created: false };
	}

	const userId = createId();
	idMap = setMappedId(idMap, entityType, mongoOid, userId);
	return { idMap, userId, created: true };
}

function findIdentityUserId(
	identityIndex: Map<string, string>,
	rawEmail: string | null,
	firstName: string | null,
	lastName: string | null,
): string | undefined {
	if (rawEmail == null) return undefined;
	return identityIndex.get(identityKey(rawEmail, firstName, lastName));
}

function registerIdentity(
	identityIndex: Map<string, string>,
	rawEmail: string | null,
	firstName: string | null,
	lastName: string | null,
	userId: string,
): void {
	if (rawEmail == null) return;
	identityIndex.set(identityKey(rawEmail, firstName, lastName), userId);
}

type ProfilesBatchState = {
	idMap: MongoIdMap;
	report: ReturnType<typeof createEmptyReport>;
	people: Map<string, ProfileSqlRow>;
	skippedKeySet: Set<string>;
	ignoredKeySet: Set<string>;
	identityIndex: Map<string, string>;
	emailState: ImportEmailDedupState;
	createId: () => string;
};

function classifyDocKeys(
	doc: unknown,
	mappedKeys: ReadonlySet<string>,
	ignoredKeys: ReadonlySet<string>,
	state: ProfilesBatchState,
): void {
	if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
		return;
	}
	const classified = classifySourceKeys(doc, mappedKeys, ignoredKeys);
	recordKeys(state.skippedKeySet, classified.skippedKeys);
	recordKeys(state.ignoredKeySet, classified.ignoredKeys);
}

function bumpCreatedOrUpdated(state: ProfilesBatchState, created: boolean): void {
	if (created) {
		state.report.created += 1;
	} else {
		state.report.updated += 1;
	}
}

function ingestTeacherDoc(state: ProfilesBatchState, doc: unknown): void {
	classifyDocKeys(doc, TEACHER_MAPPED_KEYS, TEACHER_IGNORED_KEYS, state);

	const peek = peekPersonFields(doc);
	const identityUserId = findIdentityUserId(state.identityIndex, peek.rawEmail, peek.firstName, peek.lastName);

	const mapped = mapTeacherDoc(
		doc,
		state.emailState,
		identityUserId != null ? { keepExistingEmail: true } : undefined,
	);
	if (!mapped.ok) {
		state.report.failed += 1;
		state.report.failures.push({ oid: mapped.oid, reason: mapped.reason });
		return;
	}

	const resolved = resolveUserId({
		idMap: state.idMap,
		entityType: 'teacher',
		mongoOid: mapped.row.mongoOid,
		identityUserId,
		createId: state.createId,
	});
	state.idMap = resolved.idMap;

	const existing = state.people.get(resolved.userId);
	if (existing) {
		state.people.set(
			resolved.userId,
			mergeIntoPerson(existing, {
				...mapped.row,
				isTeacher: true,
				cocIssuedOn: mapped.row.cocIssuedOn,
			}),
		);
	} else {
		state.people.set(resolved.userId, personFromTeacher(resolved.userId, mapped.row));
	}

	registerIdentity(state.identityIndex, peek.rawEmail, mapped.row.firstName, mapped.row.lastName, resolved.userId);
	bumpCreatedOrUpdated(state, resolved.created);
	for (const reason of teacherRowWarningReasons(mapped.row)) {
		state.report.warnings.push({ oid: mapped.row.mongoOid, reason });
	}
}

function ingestStudentDoc(state: ProfilesBatchState, doc: unknown): void {
	classifyDocKeys(doc, STUDENT_MAPPED_KEYS, STUDENT_IGNORED_KEYS, state);

	const peek = peekPersonFields(doc);
	const identityUserId = findIdentityUserId(state.identityIndex, peek.rawEmail, peek.firstName, peek.lastName);

	const mapped = mapStudentDoc(
		doc,
		state.emailState,
		identityUserId != null ? { keepExistingEmail: true } : undefined,
	);
	if (!mapped.ok) {
		state.report.failed += 1;
		state.report.failures.push({ oid: mapped.oid, reason: mapped.reason });
		return;
	}

	const resolved = resolveUserId({
		idMap: state.idMap,
		entityType: 'student',
		mongoOid: mapped.row.mongoOid,
		identityUserId,
		createId: state.createId,
	});
	state.idMap = resolved.idMap;

	const existing = state.people.get(resolved.userId);
	if (existing) {
		state.people.set(
			resolved.userId,
			mergeIntoPerson(existing, {
				...mapped.row,
				isStudent: true,
				dateOfBirth: mapped.row.dateOfBirth,
			}),
		);
	} else {
		state.people.set(resolved.userId, personFromStudent(resolved.userId, mapped.row));
	}

	registerIdentity(state.identityIndex, peek.rawEmail, mapped.row.firstName, mapped.row.lastName, resolved.userId);
	bumpCreatedOrUpdated(state, resolved.created);
	for (const reason of studentRowWarningReasons(mapped.row)) {
		state.report.warnings.push({ oid: mapped.row.mongoOid, reason });
	}
}

/**
 * Map teachers then students into profile rows.
 * Same email + same name (trim/lcase) → one user (null fields filled from either side).
 * Same email + different name → `duplicate_N_…` and a separate user.
 */
export function buildProfilesBatch(
	teacherDocs: unknown[],
	studentDocs: unknown[],
	initialIdMap: MongoIdMap,
	createId: () => string = () => crypto.randomUUID(),
): ImportBatch<ProfileSqlRow> {
	const state: ProfilesBatchState = {
		idMap: initialIdMap,
		report: createEmptyReport(),
		people: new Map(),
		skippedKeySet: new Set(),
		ignoredKeySet: new Set(),
		identityIndex: new Map(),
		emailState: createImportEmailDedupState(),
		createId,
	};

	for (const doc of teacherDocs) {
		ingestTeacherDoc(state, doc);
	}
	for (const doc of studentDocs) {
		ingestStudentDoc(state, doc);
	}

	assignSortedReportKeys(state.report, state.skippedKeySet, state.ignoredKeySet);
	const sqlRows = [...state.people.values()].sort((a, b) => a.email.localeCompare(b.email));
	return { idMap: state.idMap, sqlRows, report: state.report };
}
