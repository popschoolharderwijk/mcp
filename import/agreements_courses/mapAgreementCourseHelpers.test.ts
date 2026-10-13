import { beforeEach, describe, expect, it } from 'bun:test';
import { createEmptyIdMap, setMappedId } from '../shared/idMapHelpers';
import { buildCoursePriceIndex } from './coursePriceIndexHelpers';
import {
	mapAgreementCourseDoc,
	pickLatestScheduleSlot,
	setAgreementCoursePriceIndex,
	setAgreementDuoCourseOids,
	setAgreementScheduleFrequencyMap,
} from './mapAgreementCourseHelpers';

const DF_WEEKLY_30 = 'df-weekly-30';
const COURSE_OID = 'course-oid';
const STUDENT_OID = 'student-oid';
const TEACHER_OID = 'teacher-oid';
const AGREEMENT_OID = 'agreement-oid';

function baseIdMap() {
	let map = createEmptyIdMap();
	map = setMappedId(map, 'student', STUDENT_OID, 'student-uuid');
	map = setMappedId(map, 'teacher', TEACHER_OID, 'teacher-uuid');
	map = setMappedId(map, 'lesson_type', COURSE_OID, 'lesson-type-uuid');
	return map;
}

function validDoc(overrides: Record<string, unknown> = {}) {
	return {
		_id: { $oid: AGREEMENT_OID },
		course: { $oid: COURSE_OID },
		student: { $oid: STUDENT_OID },
		teacher: { $oid: TEACHER_OID },
		agreementnumber: 'CA10663',
		description: 'Desc',
		durationfreq: { $oid: DF_WEEKLY_30 },
		paymenttype: 'incasso',
		monthlyprice: 42.5,
		startdate: '2024-08-26',
		comments: 'Note',
		schedule: [{ startdatetime: '2024-03-29T13:51:13Z' }, { startdatetime: '2026-02-24T19:35:52Z' }],
		...overrides,
	};
}

describe('pickLatestScheduleSlot', () => {
	it('picks the latest UTC day and time', () => {
		expect(
			pickLatestScheduleSlot([
				{ startdatetime: '2024-03-29T13:51:13Z' },
				{ startdatetime: '2026-02-24T19:35:52Z' },
			]),
		).toEqual({ dayOfWeek: 2, startTime: '19:35:52' });
	});

	it('returns null when no usable datetimes exist', () => {
		expect(pickLatestScheduleSlot([])).toBeNull();
		expect(pickLatestScheduleSlot([{ startdatetime: 'not-a-date' }])).toBeNull();
	});
});

describe('mapAgreementCourseDoc', () => {
	beforeEach(() => {
		setAgreementDuoCourseOids(new Set());
		setAgreementScheduleFrequencyMap(new Map([[DF_WEEKLY_30, { durationMinutes: 30, frequency: 'weekly' }]]));
		setAgreementCoursePriceIndex(
			buildCoursePriceIndex([
				{
					_id: { $oid: COURSE_OID },
					frequency_mnd_prices: [
						{ durationfreq: { $oid: DF_WEEKLY_30 }, price: 73.38, startdate: '2026-09-01' },
					],
				},
			]),
		);
	});

	it('maps a valid document onto lesson_agreements fields', () => {
		const result = mapAgreementCourseDoc(validDoc(), baseIdMap());
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.row).toEqual({
			mongoOid: AGREEMENT_OID,
			studentUserId: 'student-uuid',
			teacherUserId: 'teacher-uuid',
			lessonTypeId: 'lesson-type-uuid',
			durationMinutes: 30,
			frequency: 'weekly',
			pricePerLesson: 73.38,
			dayOfWeek: 2,
			startTime: '19:35:52',
			startDate: '2024-08-26',
			endDate: null,
			isActive: true,
			notes: 'CA10663\nDesc\nNote',
			signupSource: 'staff',
			paymentMethod: 'sepa',
			monthlyAmountCents: 4250,
			duoPairId: null,
			synthesizeLessonTypeOption: false,
			optionWarning: null,
		});
	});

	it('assigns a duo_pair_id when the course is classified as DUO', () => {
		setAgreementDuoCourseOids(new Set([COURSE_OID]));
		const result = mapAgreementCourseDoc(validDoc(), baseIdMap());
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.row.duoPairId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
	});

	it('synthesizes a lesson_type_option when durationfreq is missing from frequency_mnd_prices', () => {
		const missingDf = 'df-missing-from-catalog';
		setAgreementScheduleFrequencyMap(
			new Map([
				[DF_WEEKLY_30, { durationMinutes: 30, frequency: 'weekly' }],
				[missingDf, { durationMinutes: 45, frequency: 'biweekly' }],
			]),
		);
		setAgreementCoursePriceIndex(
			buildCoursePriceIndex([
				{
					_id: { $oid: COURSE_OID },
					price: 16.34,
					frequency_mnd_prices: [
						{ durationfreq: { $oid: DF_WEEKLY_30 }, price: 73.38, startdate: '2026-09-01' },
					],
				},
			]),
		);

		const result = mapAgreementCourseDoc(validDoc({ durationfreq: { $oid: missingDf } }), baseIdMap());
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.row.durationMinutes).toBe(45);
		expect(result.row.frequency).toBe('biweekly');
		expect(result.row.pricePerLesson).toBe(16.34);
		expect(result.row.synthesizeLessonTypeOption).toBe(true);
		expect(result.row.optionWarning).toBe(
			`Missing frequency_mnd_prices for durationfreq ${missingDf}; synthesizing lesson_type_option at 16.34`,
		);
	});

	it('fails when student teacher or course id-map entries are missing', () => {
		expect(mapAgreementCourseDoc(validDoc(), createEmptyIdMap())).toEqual({
			ok: false,
			oid: AGREEMENT_OID,
			reason: `Missing id-map student ${STUDENT_OID}`,
		});

		let map = createEmptyIdMap();
		map = setMappedId(map, 'student', STUDENT_OID, 'student-uuid');
		expect(mapAgreementCourseDoc(validDoc(), map)).toEqual({
			ok: false,
			oid: AGREEMENT_OID,
			reason: `Missing id-map teacher ${TEACHER_OID}`,
		});

		map = setMappedId(map, 'teacher', TEACHER_OID, 'teacher-uuid');
		expect(mapAgreementCourseDoc(validDoc(), map)).toEqual({
			ok: false,
			oid: AGREEMENT_OID,
			reason: `Missing id-map lesson_type ${COURSE_OID}`,
		});
	});

	it('fails on unknown durationfreq missing price schedule startdate or paymenttype', () => {
		expect(mapAgreementCourseDoc(validDoc({ durationfreq: { $oid: 'unknown' } }), baseIdMap())).toEqual({
			ok: false,
			oid: AGREEMENT_OID,
			reason: 'Unknown durationfreq oid unknown',
		});

		setAgreementCoursePriceIndex(buildCoursePriceIndex([]));
		expect(mapAgreementCourseDoc(validDoc(), baseIdMap())).toEqual({
			ok: false,
			oid: AGREEMENT_OID,
			reason: `Missing course price for course ${COURSE_OID} durationfreq ${DF_WEEKLY_30}`,
		});

		setAgreementCoursePriceIndex(
			buildCoursePriceIndex([
				{
					_id: { $oid: COURSE_OID },
					frequency_mnd_prices: [
						{ durationfreq: { $oid: DF_WEEKLY_30 }, price: 73.38, startdate: '2026-09-01' },
					],
				},
			]),
		);

		expect(mapAgreementCourseDoc(validDoc({ schedule: [] }), baseIdMap())).toEqual({
			ok: false,
			oid: AGREEMENT_OID,
			reason: 'Missing usable schedule startdatetime',
		});

		expect(mapAgreementCourseDoc(validDoc({ startdate: 'not-a-date' }), baseIdMap())).toEqual({
			ok: false,
			oid: AGREEMENT_OID,
			reason: 'Missing or invalid startdate',
		});

		expect(mapAgreementCourseDoc(validDoc({ paymenttype: 'cash' }), baseIdMap())).toEqual({
			ok: false,
			oid: AGREEMENT_OID,
			reason: 'Unsupported paymenttype "cash"',
		});
	});

	it('maps invoice paymenttype to manual', () => {
		const result = mapAgreementCourseDoc(validDoc({ paymenttype: 'invoice' }), baseIdMap());
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.row.paymentMethod).toBe('manual');
	});
});
