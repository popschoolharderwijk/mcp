import { classifyCourseFlags } from '../courses/courseFlagsHelpers';
import type { LessonFrequency, ScheduleFrequencyEntry } from '../courses/types';
import { normalizeIsoDate, toAmsterdamScheduleSlot } from '../shared/dateHelpers';
import { getMappedId, type MongoIdMap } from '../shared/idMapHelpers';
import { asFiniteNumber } from '../shared/numberHelpers';
import { extractMongoOid } from '../shared/parseMongoExportHelpers';
import { type CoursePriceIndex, resolveAgreementCoursePrice } from './coursePriceIndexHelpers';
import { deriveEndDateFromLessonCount, eventsLessonCountMismatchWarning } from './deriveAgreementEndDateHelpers';
import { computeGroupAgendaStartDate } from './groupLessonImportHelpers';
import type { AgreementCourseMapResult, MappedAgreementCourseRow } from './types';

/** Mongo keys that `mapAgreementCourseDoc` reads into the import. */
export const MAPPED_KEYS = new Set([
	'_id',
	'course',
	'student',
	'teacher',
	'agreementnumber',
	'description',
	'durationfreq',
	'paymenttype',
	'monthlyprice',
	'startdate',
	'enddate',
	'comments',
	'schedule',
	'numberoflessons',
	'autorenewal',
	'events',
]);

/** Known Mongo keys that we intentionally do not import. */
export const IGNORED_KEYS = new Set([
	'processed',
	'extra_costs',
	'debtor',
	'custom_monthly_price',
	'funding',
	'haltbilling',
	'noscheduling',
	'teacher_notes',
]);

let scheduleFrequencyMap: Map<string, ScheduleFrequencyEntry> = new Map();
let coursePriceIndex: CoursePriceIndex = new Map();
let duoCourseOids: Set<string> = new Set();
let groupCourseOids: Set<string> = new Set();
let courseNameByOid: Map<string, string> = new Map();

export function setAgreementScheduleFrequencyMap(map: Map<string, ScheduleFrequencyEntry>): void {
	scheduleFrequencyMap = map;
}

export function setAgreementCoursePriceIndex(index: CoursePriceIndex): void {
	coursePriceIndex = index;
}

export function setAgreementDuoCourseOids(oids: Set<string>): void {
	duoCourseOids = oids;
}

export function setAgreementGroupCourseOids(oids: Set<string>): void {
	groupCourseOids = oids;
}

export function setAgreementCourseNameByOid(names: Map<string, string>): void {
	courseNameByOid = names;
}

function readCourseName(record: Record<string, unknown>): string {
	return typeof record.name === 'string' ? record.name.trim() : '';
}

/** Visit named course docs (oid + trimmed name); skips invalid / nameless rows. */
function forEachNamedCourse(
	courseDocs: unknown[],
	visit: (oid: string, name: string, record: Record<string, unknown>) => void,
): void {
	for (const doc of courseDocs) {
		if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) continue;
		const record = doc as Record<string, unknown>;
		const oid = extractMongoOid(record._id);
		if (!oid) continue;
		const name = readCourseName(record);
		if (!name) continue;
		visit(oid, name, record);
	}
}

/** Course Mongo oids whose name classifies as DUO (same rules as courses import). */
export function buildDuoCourseOidSet(courseDocs: unknown[]): Set<string> {
	const oids = new Set<string>();
	forEachNamedCourse(courseDocs, (oid, name, record) => {
		if (classifyCourseFlags(name, asFiniteNumber(record.maxparticipants)).isDuoLesson) {
			oids.add(oid);
		}
	});
	return oids;
}

/** Course Mongo oids classified as group lessons (same rules as courses import). */
export function buildGroupCourseOidSet(courseDocs: unknown[]): Set<string> {
	const oids = new Set<string>();
	forEachNamedCourse(courseDocs, (oid, name, record) => {
		if (classifyCourseFlags(name, asFiniteNumber(record.maxparticipants)).isGroupLesson) {
			oids.add(oid);
		}
	});
	return oids;
}

/** Mongo course oid → trimmed name (for lesson group titles). */
export function buildCourseNameByOid(courseDocs: unknown[]): Map<string, string> {
	const names = new Map<string, string>();
	forEachNamedCourse(courseDocs, (oid, name) => {
		names.set(oid, name);
	});
	return names;
}

function asOptionalString(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function eurosToCents(euros: number): number {
	return Math.round(euros * 100);
}

/** Mongo paymenttype → lesson_agreements.payment_method. */
function mapPaymentType(paymentType: string | null): 'sepa' | 'manual' | null {
	if (paymentType === 'incasso') return 'sepa';
	if (paymentType === 'invoice') return 'manual';
	return null;
}

function parseScheduleInstant(value: unknown): Date | null {
	if (typeof value !== 'string' || value.trim() === '') return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

/** Latest usable schedule startdatetime → day_of_week + start_time in Europe/Amsterdam. */
export function pickLatestScheduleSlot(schedule: unknown): { dayOfWeek: number; startTime: string } | null {
	if (!Array.isArray(schedule)) return null;

	let latest: Date | null = null;
	for (const item of schedule) {
		if (item === null || typeof item !== 'object' || Array.isArray(item)) continue;
		const instant = parseScheduleInstant((item as Record<string, unknown>).startdatetime);
		if (!instant) continue;
		if (!latest || instant.getTime() > latest.getTime()) {
			latest = instant;
		}
	}
	if (!latest) return null;

	return toAmsterdamScheduleSlot(latest);
}

function buildNotes(
	agreementNumber: string | null,
	description: string | null,
	comments: string | null,
): string | null {
	const parts = [agreementNumber, description, comments].filter((part): part is string => part != null);
	return parts.length > 0 ? parts.join('\n') : null;
}

function mapFail(oid: string | null, reason: string): AgreementCourseMapResult {
	return { ok: false, oid, reason };
}

function requireMappedId(
	idMap: MongoIdMap,
	entityType: string,
	mongoOid: string | null,
	agreementOid: string,
): { ok: true; id: string; mongoOid: string } | { ok: false; result: AgreementCourseMapResult } {
	if (!mongoOid) {
		return { ok: false, result: mapFail(agreementOid, `Missing ${entityType} oid`) };
	}
	const id = getMappedId(idMap, entityType, mongoOid);
	if (!id) {
		return { ok: false, result: mapFail(agreementOid, `Missing id-map ${entityType} ${mongoOid}`) };
	}
	return { ok: true, id, mongoOid };
}

type MappedParties = {
	studentUserId: string;
	teacherUserId: string;
	lessonTypeId: string;
	courseOid: string;
};

function resolveMappedParties(
	idMap: MongoIdMap,
	record: Record<string, unknown>,
	agreementOid: string,
): { ok: true; parties: MappedParties } | { ok: false; result: AgreementCourseMapResult } {
	const student = requireMappedId(idMap, 'student', extractMongoOid(record.student), agreementOid);
	if (!student.ok) return student;
	const teacher = requireMappedId(idMap, 'teacher', extractMongoOid(record.teacher), agreementOid);
	if (!teacher.ok) return teacher;
	const lessonType = requireMappedId(idMap, 'lesson_type', extractMongoOid(record.course), agreementOid);
	if (!lessonType.ok) return lessonType;

	return {
		ok: true,
		parties: {
			studentUserId: student.id,
			teacherUserId: teacher.id,
			lessonTypeId: lessonType.id,
			courseOid: lessonType.mongoOid,
		},
	};
}

type DurationPriceResolved = {
	durationMinutes: number;
	frequency: ScheduleFrequencyEntry['frequency'];
	pricePerLesson: number;
	synthesizeLessonTypeOption: boolean;
	optionWarning: string | null;
};

function resolveDurationAndPrice(
	record: Record<string, unknown>,
	courseOid: string,
	agreementOid: string,
): { ok: true; value: DurationPriceResolved } | { ok: false; result: AgreementCourseMapResult } {
	const durationFreqOid = extractMongoOid(record.durationfreq);
	if (!durationFreqOid) {
		return { ok: false, result: mapFail(agreementOid, 'Missing durationfreq oid') };
	}
	const scheduleEntry = scheduleFrequencyMap.get(durationFreqOid);
	if (!scheduleEntry) {
		return { ok: false, result: mapFail(agreementOid, `Unknown durationfreq oid ${durationFreqOid}`) };
	}

	const resolvedPrice = resolveAgreementCoursePrice(coursePriceIndex, courseOid, durationFreqOid);
	if (resolvedPrice == null) {
		return {
			ok: false,
			result: mapFail(
				agreementOid,
				`Missing course price for course ${courseOid} durationfreq ${durationFreqOid}`,
			),
		};
	}

	return {
		ok: true,
		value: {
			durationMinutes: scheduleEntry.durationMinutes,
			frequency: scheduleEntry.frequency,
			pricePerLesson: resolvedPrice.price,
			synthesizeLessonTypeOption: resolvedPrice.synthesizeLessonTypeOption,
			optionWarning: resolvedPrice.synthesizeLessonTypeOption
				? `Missing frequency_mnd_prices for durationfreq ${durationFreqOid}; synthesizing lesson_type_option at ${resolvedPrice.price}`
				: null,
		},
	};
}

function resolveScheduleAndStart(
	record: Record<string, unknown>,
	agreementOid: string,
):
	| { ok: true; dayOfWeek: number; startTime: string; startDate: string; endDate: string | null }
	| { ok: false; result: AgreementCourseMapResult } {
	const scheduleSlot = pickLatestScheduleSlot(record.schedule);
	if (!scheduleSlot) {
		return { ok: false, result: mapFail(agreementOid, 'Missing usable schedule startdatetime') };
	}

	const startDate = normalizeIsoDate(asOptionalString(record.startdate));
	if (!startDate) {
		return { ok: false, result: mapFail(agreementOid, 'Missing or invalid startdate') };
	}

	const endDateRaw = asOptionalString(record.enddate);
	let endDate: string | null = null;
	if (endDateRaw != null) {
		endDate = normalizeIsoDate(endDateRaw);
		if (!endDate) {
			return { ok: false, result: mapFail(agreementOid, 'Invalid enddate') };
		}
		if (endDate < startDate) {
			return { ok: false, result: mapFail(agreementOid, 'enddate must be >= startdate') };
		}
	}

	return {
		ok: true,
		dayOfWeek: scheduleSlot.dayOfWeek,
		startTime: scheduleSlot.startTime,
		startDate,
		endDate,
	};
}

/** Positive integer lesson count from Mongo `numberoflessons`, or null. */
function readPositiveLessonCount(value: unknown): number | null {
	const n = asFiniteNumber(value);
	if (n == null || !Number.isInteger(n) || n < 1) return null;
	return n;
}

/**
 * Prefer explicit enddate; else for non-autorenewal packages derive from
 * first weekday-aligned occurrence + (n - 1) frequency intervals.
 */
function resolveAgreementEndDate(
	record: Record<string, unknown>,
	explicitEndDate: string | null,
	startDate: string,
	dayOfWeek: number,
	frequency: LessonFrequency,
): string | null {
	if (explicitEndDate != null) return explicitEndDate;
	if (record.autorenewal !== false) return null;
	const numberOfLessons = readPositiveLessonCount(record.numberoflessons);
	if (numberOfLessons == null) return null;
	const firstOccurrence = computeGroupAgendaStartDate(startDate, dayOfWeek);
	return deriveEndDateFromLessonCount(firstOccurrence, frequency, numberOfLessons);
}

function resolvePaymentMethod(
	record: Record<string, unknown>,
	agreementOid: string,
): { ok: true; paymentMethod: 'sepa' | 'manual' } | { ok: false; result: AgreementCourseMapResult } {
	const paymentType = asOptionalString(record.paymenttype);
	const paymentMethod = mapPaymentType(paymentType);
	if (paymentMethod == null) {
		return {
			ok: false,
			result: mapFail(
				agreementOid,
				paymentType == null ? 'Missing paymenttype' : `Unsupported paymenttype "${paymentType}"`,
			),
		};
	}
	return { ok: true, paymentMethod };
}

/** Convert a Mongo agreements_course document into a mapped lesson_agreements row. */
export function mapAgreementCourseDoc(doc: unknown, idMap: MongoIdMap): AgreementCourseMapResult {
	if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
		return mapFail(null, 'Document is not an object');
	}

	const record = doc as Record<string, unknown>;
	const mongoOid = extractMongoOid(record._id);
	if (!mongoOid) {
		return mapFail(null, 'Missing _id.$oid');
	}

	const parties = resolveMappedParties(idMap, record, mongoOid);
	if (!parties.ok) return parties.result;

	const durationPrice = resolveDurationAndPrice(record, parties.parties.courseOid, mongoOid);
	if (!durationPrice.ok) return durationPrice.result;

	const scheduleStart = resolveScheduleAndStart(record, mongoOid);
	if (!scheduleStart.ok) return scheduleStart.result;

	const payment = resolvePaymentMethod(record, mongoOid);
	if (!payment.ok) return payment.result;

	const monthlyPrice = asFiniteNumber(record.monthlyprice);
	const courseOid = parties.parties.courseOid;
	const isGroupLesson = groupCourseOids.has(courseOid);
	const numberOfLessons = readPositiveLessonCount(record.numberoflessons);
	const endDate = resolveAgreementEndDate(
		record,
		scheduleStart.endDate,
		scheduleStart.startDate,
		scheduleStart.dayOfWeek,
		durationPrice.value.frequency,
	);
	const row: MappedAgreementCourseRow = {
		mongoOid,
		studentUserId: parties.parties.studentUserId,
		teacherUserId: parties.parties.teacherUserId,
		lessonTypeId: parties.parties.lessonTypeId,
		courseOid,
		courseName: isGroupLesson ? (courseNameByOid.get(courseOid) ?? null) : null,
		durationMinutes: durationPrice.value.durationMinutes,
		frequency: durationPrice.value.frequency,
		pricePerLesson: durationPrice.value.pricePerLesson,
		dayOfWeek: scheduleStart.dayOfWeek,
		startTime: scheduleStart.startTime,
		startDate: scheduleStart.startDate,
		endDate,
		isActive: true,
		notes: buildNotes(
			asOptionalString(record.agreementnumber),
			asOptionalString(record.description),
			asOptionalString(record.comments),
		),
		signupSource: 'staff',
		paymentMethod: payment.paymentMethod,
		monthlyAmountCents: monthlyPrice != null ? eurosToCents(monthlyPrice) : null,
		duoPairId: !isGroupLesson && duoCourseOids.has(courseOid) ? crypto.randomUUID() : null,
		isGroupLesson,
		synthesizeLessonTypeOption: durationPrice.value.synthesizeLessonTypeOption,
		optionWarning: durationPrice.value.optionWarning,
		eventsMismatchWarning: eventsLessonCountMismatchWarning(record.events, numberOfLessons),
	};

	return { ok: true, row };
}

export function agreementCourseRowWarningReasons(row: MappedAgreementCourseRow): string[] {
	const warnings: string[] = [];
	if (row.optionWarning != null) warnings.push(row.optionWarning);
	if (row.eventsMismatchWarning != null) warnings.push(row.eventsMismatchWarning);
	return warnings;
}
