import type { MappedImportRow } from '../shared/converterTypes';

export type LessonFrequency = 'weekly' | 'biweekly' | 'monthly';

export type ScheduleFrequencyEntry = {
	durationMinutes: number;
	frequency: LessonFrequency;
};

export type MappedCourseOption = {
	durationMinutes: number;
	frequency: LessonFrequency;
	/** Euro amount stored in legacy `price_per_lesson`. */
	pricePerLesson: number;
	/** Same catalog price in cents for both age bands. */
	pricePerLessonUnder21Cents: number;
	pricePerLessonAdultCents: number;
	startDate: string | null;
	skippedUnknownOid: string | null;
};

export type MappedCourseRow = MappedImportRow & {
	name: string;
	costCenter: string | null;
	isDuoLesson: boolean;
	isGroupLesson: boolean;
	icon: string;
	color: string;
	options: MappedCourseOption[];
	optionWarnings: string[];
};

export type CourseSqlRow = MappedCourseRow & { lessonTypeId: string };

export type CourseMapResult = { ok: true; row: MappedCourseRow } | { ok: false; oid: string | null; reason: string };
