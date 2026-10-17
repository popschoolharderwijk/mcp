import type { LessonFrequency } from '../courses/types';
import type { MapDocResult, MappedImportRow } from '../shared/converterTypes';

export type MappedAgreementCourseRow = MappedImportRow & {
	studentUserId: string;
	teacherUserId: string;
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
	endDate: string | null;
	isActive: true;
	notes: string | null;
	signupSource: 'staff';
	paymentMethod: 'sepa' | 'manual';
	monthlyAmountCents: number | null;
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
};

export type AgreementCourseMapResult = MapDocResult<MappedAgreementCourseRow>;
