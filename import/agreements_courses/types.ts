import type { LessonFrequency } from '../courses/types';
import type { MapDocResult, MappedImportRow } from '../shared/converterTypes';

export type SchedulePhaseShiftDeviationSql = {
	/** `lesson_agreement` for 1:1 lessons; `lesson_group` for imported group slots. */
	sourceType: 'lesson_agreement' | 'lesson_group';
	sourceId: string;
	originalDate: string;
	actualDate: string;
	startTime: string;
};

export type MappedAgreementCourseRow = MappedImportRow & {
	studentUserId: string;
	teacherUserId: string;
	studentMongoOid: string;
	teacherMongoOid: string;
	lessonTypeId: string;
	/** Mongo course oid — used to detect group courses and name lesson groups. */
	courseOid: string;
	/** Course display name when this agreement belongs to a group lesson type. */
	courseName: string | null;
	durationMinutes: number;
	frequency: LessonFrequency;
	pricePerLesson: number;
	dayOfWeek: number;
	startTime: string;
	startDate: string;
	/** Amsterdam YMD of the schedule slot used for day/time; biweekly group phase key. */
	scheduleSlotDate: string;
	endDate: string | null;
	isActive: true;
	notes: string | null;
	signupSource: 'staff';
	/**
	 * Required by DB when lesson type is duo. Import assigns a fresh UUID per agreement
	 * (unpaired half is allowed; max two agreements share a pair).
	 */
	duoPairId: string | null;
	/** True when the course is classified as a group lesson (not duo). */
	isGroupLesson: boolean;
	/** When true, SQL also upserts this duration/frequency onto lesson_type_options. */
	synthesizeLessonTypeOption: boolean;
	/** Warning when a missing catalog durationfreq was synthesized from course fallback price. */
	optionWarning: string | null;
	/** Warning when Mongo events.length disagrees with numberoflessons. */
	eventsMismatchWarning: string | null;
};

export type AgreementCourseSqlRow = MappedAgreementCourseRow & {
	agreementId: string;
	/** Shared lesson_groups.id when isGroupLesson; assigned after mapping. */
	lessonGroupId: string | null;
	/** Slot key used to assign lessonGroupId; kept so SQL rebuild stays idempotent. */
	groupSlotKey: string | null;
	/** Spanning agenda deviation when Mongo lesson dates permanently left the recurrence grid. */
	phaseShiftDeviation: SchedulePhaseShiftDeviationSql | null;
};

export type AgreementCourseMapResult = MapDocResult<MappedAgreementCourseRow>;
