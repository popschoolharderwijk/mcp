import type { LessonFrequency } from '../courses/types';
import type { MapDocResult, MappedImportRow } from '../shared/converterTypes';

export type MappedAgreementCourseRow = MappedImportRow & {
	studentUserId: string;
	teacherUserId: string;
	lessonTypeId: string;
	durationMinutes: number;
	frequency: LessonFrequency;
	pricePerLesson: number;
	dayOfWeek: number;
	startTime: string;
	startDate: string;
	endDate: null;
	isActive: true;
	notes: string | null;
	signupSource: 'staff';
	paymentMethod: 'sepa' | 'manual';
	monthlyAmountCents: number | null;
	/** When true, SQL also upserts this duration/frequency onto lesson_type_options. */
	synthesizeLessonTypeOption: boolean;
	/** Warning when a missing catalog durationfreq was synthesized from course fallback price. */
	optionWarning: string | null;
};

export type AgreementCourseSqlRow = MappedAgreementCourseRow & { agreementId: string };

export type AgreementCourseMapResult = MapDocResult<MappedAgreementCourseRow>;
