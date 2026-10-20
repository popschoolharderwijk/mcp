import { describe, expect, it } from 'bun:test';
import {
	buildAgreementImportReferenceError,
	buildLegacyAgreementUpsertPayload,
	normalizeLegacyAgreementEndDate,
	normalizeLegacyAgreementStartTime,
	resolveAgreementImportReferences,
} from '../../../supabase/functions/import-legacy-data/importAgreementsPure';

const STUDENT_LEGACY = 'student-legacy-1';
const TEACHER_LEGACY = 'teacher-legacy-1';
const TYPE_LEGACY = 'type-legacy-1';
const STUDENT_USER = '11111111-1111-1111-1111-111111111111';
const TEACHER_USER = '22222222-2222-2222-2222-222222222222';
const LESSON_TYPE = '33333333-3333-3333-3333-333333333333';

const agreementRow = {
	legacy_id: 'agr-legacy-1',
	student_legacy_id: STUDENT_LEGACY,
	teacher_legacy_id: TEACHER_LEGACY,
	lesson_type_legacy_id: TYPE_LEGACY,
	duration_minutes: 45,
	frequency: 'weekly',
	day_of_week: 1,
	start_time: '14:00',
	start_date: '2026-09-01',
	end_date: '',
	notes: 'Legacy note',
	signup_source: null,
};

describe('normalizeLegacyAgreementStartTime', () => {
	it('appends seconds when start time has hours and minutes only', () => {
		expect(normalizeLegacyAgreementStartTime('14:00')).toBe('14:00:00');
	});

	it('keeps start time unchanged when seconds are present', () => {
		expect(normalizeLegacyAgreementStartTime('14:00:30')).toBe('14:00:30');
	});
});

describe('normalizeLegacyAgreementEndDate', () => {
	it('returns null for blank end dates', () => {
		expect(normalizeLegacyAgreementEndDate('')).toBeNull();
		expect(normalizeLegacyAgreementEndDate(null)).toBeNull();
	});

	it('returns the end date when present', () => {
		expect(normalizeLegacyAgreementEndDate('2027-06-30')).toBe('2027-06-30');
	});
});

describe('resolveAgreementImportReferences', () => {
	it('returns mapped ids when all references exist', () => {
		const studentMap = new Map([[STUDENT_LEGACY, STUDENT_USER]]);
		const teacherMap = new Map([[TEACHER_LEGACY, TEACHER_USER]]);
		const typeMap = new Map([[TYPE_LEGACY, LESSON_TYPE]]);

		expect(resolveAgreementImportReferences(agreementRow, studentMap, teacherMap, typeMap)).toEqual({
			studentUserId: STUDENT_USER,
			teacherUserId: TEACHER_USER,
			lessonTypeId: LESSON_TYPE,
		});
	});

	it('returns null when a reference is missing', () => {
		expect(
			resolveAgreementImportReferences(
				agreementRow,
				new Map(),
				new Map([[TEACHER_LEGACY, TEACHER_USER]]),
				new Map(),
			),
		).toBeNull();
	});
});

describe('buildLegacyAgreementUpsertPayload', () => {
	it('builds the agreement upsert payload with normalized fields', () => {
		expect(
			buildLegacyAgreementUpsertPayload(agreementRow, {
				studentUserId: STUDENT_USER,
				teacherUserId: TEACHER_USER,
				lessonTypeId: LESSON_TYPE,
			}),
		).toEqual({
			student_user_id: STUDENT_USER,
			teacher_user_id: TEACHER_USER,
			lesson_type_id: LESSON_TYPE,
			duration_minutes: 45,
			frequency: 'weekly',
			day_of_week: 1,
			start_time: '14:00:00',
			start_date: '2026-09-01',
			end_date: null,
			notes: 'Legacy note',
			signup_source: 'legacy-import',
			is_active: true,
		});
	});
});

describe('buildAgreementImportReferenceError', () => {
	it('returns the reference error message', () => {
		expect(buildAgreementImportReferenceError().message).toBe('Onbekende referentie (student/teacher/lesson_type)');
	});
});
