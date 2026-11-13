import { formatDateToDb } from '@/lib/date/date-format';
import { getOccurrenceDatesInRange } from '@/lib/lessonHelpers';
import { splitTimeRangeIntoSlots, timeRangesOverlap, timeToMinutes } from '@/lib/time/time-range';
import type { LessonFrequency } from '@/types/lesson-agreements';

/** Teacher availability slot from teacher_availability table */
export interface AvailabilitySlot {
	day_of_week: number;
	start_time: string;
	end_time: string;
	room_name?: string | null;
}

/** Minimal agreement shape used to compute slot occupancy in a period */
export interface ExistingAgreementForSlot {
	day_of_week: number;
	start_time: string;
	start_date: string;
	end_date: string | null;
	frequency: LessonFrequency;
	duration_minutes: number;
}

export type SlotStatus = 'free' | 'occupied' | 'partial';

export interface SlotWithStatus {
	day_of_week: number;
	start_time: string;
	end_time: string;
	status: SlotStatus;
	totalOccurrences: number;
	occupiedOccurrences: number;
	roomName?: string | null;
}

/** Whether an agreement has an occurrence on this date (given its frequency and day) */
function agreementHasOccurrenceOnDate(agreement: ExistingAgreementForSlot, dateStr: string): boolean {
	const date = new Date(dateStr + 'T12:00:00');
	const agreementStart = new Date(agreement.start_date + 'T12:00:00');
	const agreementEnd = agreement.end_date ? new Date(agreement.end_date + 'T12:00:00') : new Date(9999, 11, 31);
	if (date < agreementStart || date > agreementEnd) return false;
	if (agreement.day_of_week !== date.getDay()) return false;

	if (agreement.frequency === 'daily') return true;
	if (agreement.frequency === 'weekly') return true;
	if (agreement.frequency === 'biweekly') {
		const msPerTwoWeeks = 14 * 24 * 60 * 60 * 1000;
		const diff = date.getTime() - agreementStart.getTime();
		return Math.round(diff / msPerTwoWeeks) % 1 === 0;
	}
	// monthly: same day of month
	return date.getDate() === agreementStart.getDate();
}

/**
 * Compute status (free / occupied / partial) for each availability slot of a teacher
 * in the given period, based on existing lesson agreements.
 *
 * Important: existingAgreements must be ALL agreements for this teacher in the period
 * (all lesson types). Otherwise a teacher who gives e.g. guitar and drums could
 * appear "free" for guitar in a slot where they already have drums.
 * - free: no agreements in this slot in the period
 * - partial: some occurrences occupied (slot remains selectable; teacher resolves conflicts)
 * - occupied: every occurrence in the period is occupied (slot not selectable)
 */
/** Derive slot status from occupied vs total occurrence counts */
function slotStatusFromOccupancy(occupiedCount: number, totalOccurrences: number): SlotStatus {
	if (occupiedCount === 0) return 'free';
	if (occupiedCount === totalOccurrences) return 'occupied';
	return 'partial';
}

/** Whether any agreement occupies this sub-slot on a specific date */
function isSubSlotOccupiedOnDate(
	startMin: number,
	endMin: number,
	dateStr: string,
	existingAgreements: ExistingAgreementForSlot[],
): boolean {
	for (const agreement of existingAgreements) {
		if (!agreementHasOccurrenceOnDate(agreement, dateStr)) continue;
		const agreeStart = timeToMinutes(agreement.start_time);
		if (agreeStart == null) continue;
		const agreeEnd = agreeStart + agreement.duration_minutes;
		if (timeRangesOverlap(startMin, endMin, agreeStart, agreeEnd)) return true;
	}
	return false;
}

/** Count how many occurrence dates in the period are occupied for a sub-slot */
function countOccupiedOccurrences(
	occurrenceDates: string[],
	startMin: number,
	endMin: number,
	existingAgreements: ExistingAgreementForSlot[],
): number {
	let occupiedCount = 0;
	for (const dateStr of occurrenceDates) {
		if (isSubSlotOccupiedOnDate(startMin, endMin, dateStr, existingAgreements)) {
			occupiedCount++;
		}
	}
	return occupiedCount;
}

function buildSlotWithStatus(
	avail: AvailabilitySlot,
	sub: { start_time: string; end_time: string },
	occurrenceDates: string[],
	durationMinutes: number,
	existingAgreements: ExistingAgreementForSlot[],
): SlotWithStatus | null {
	const totalOccurrences = occurrenceDates.length;
	if (totalOccurrences === 0) return null;

	const startMin = timeToMinutes(sub.start_time);
	if (startMin == null) return null;
	const endMin = startMin + durationMinutes;

	const occupiedCount = countOccupiedOccurrences(occurrenceDates, startMin, endMin, existingAgreements);

	return {
		day_of_week: avail.day_of_week,
		start_time: sub.start_time,
		end_time: sub.end_time,
		status: slotStatusFromOccupancy(occupiedCount, totalOccurrences),
		totalOccurrences,
		occupiedOccurrences: occupiedCount,
		roomName: avail.room_name ?? null,
	};
}

export function getSlotStatuses(
	periodStart: Date,
	periodEnd: Date,
	availabilitySlots: AvailabilitySlot[],
	existingAgreements: ExistingAgreementForSlot[],
	durationMinutes: number,
	frequency: LessonFrequency,
): SlotWithStatus[] {
	const result: SlotWithStatus[] = [];

	for (const avail of availabilitySlots) {
		const subSlots = splitTimeRangeIntoSlots(avail.start_time, avail.end_time, durationMinutes);
		for (const sub of subSlots) {
			const occurrenceDates = getOccurrenceDatesInRange(avail.day_of_week, periodStart, periodEnd, frequency);
			const slot = buildSlotWithStatus(avail, sub, occurrenceDates, durationMinutes, existingAgreements);
			if (slot) result.push(slot);
		}
	}

	return result;
}

/** A scheduled trial lesson that can occupy a slot on a specific date */
export interface ExistingTrialLessonForSlot {
	teacher_user_id: string;
	scheduled_date: string;
	scheduled_start_time: string;
	duration_minutes: number;
}

/** A free slot for a specific teacher on a specific date */
export interface FreeSlotForTeacher {
	date: string;
	day_of_week: number;
	start_time: string;
	end_time: string;
	teacher_user_id: string;
}

function* iterateDates(periodStart: Date, periodEnd: Date): Generator<Date> {
	const cur = new Date(periodStart);
	cur.setHours(12, 0, 0, 0);
	const end = new Date(periodEnd);
	end.setHours(12, 0, 0, 0);
	while (cur <= end) {
		yield new Date(cur);
		cur.setDate(cur.getDate() + 1);
	}
}

function slotOverlapsAgreement(
	startMin: number,
	endMin: number,
	dateStr: string,
	agreements: ExistingAgreementForSlot[],
): boolean {
	for (const a of agreements) {
		if (!agreementHasOccurrenceOnDate(a, dateStr)) continue;
		const aStart = timeToMinutes(a.start_time);
		if (aStart === null) continue;
		if (timeRangesOverlap(startMin, endMin, aStart, aStart + a.duration_minutes)) return true;
	}
	return false;
}

function slotOverlapsTrial(
	startMin: number,
	endMin: number,
	dateStr: string,
	trialLessons: ExistingTrialLessonForSlot[],
): boolean {
	for (const t of trialLessons) {
		if (t.scheduled_date !== dateStr) continue;
		const tStart = timeToMinutes(t.scheduled_start_time);
		if (tStart === null) continue;
		if (timeRangesOverlap(startMin, endMin, tStart, tStart + t.duration_minutes)) return true;
	}
	return false;
}

function appendFreeSlotsForTeacherDay(
	result: FreeSlotForTeacher[],
	dateStr: string,
	dow: number,
	teacherId: string,
	dayAvail: AvailabilitySlot[],
	agreements: ExistingAgreementForSlot[],
	trialLessons: ExistingTrialLessonForSlot[],
	durationMinutes: number,
): void {
	for (const avail of dayAvail) {
		const subSlots = splitTimeRangeIntoSlots(avail.start_time, avail.end_time, durationMinutes);
		for (const sub of subSlots) {
			const startMin = timeToMinutes(sub.start_time);
			if (startMin === null) continue;
			const endMin = startMin + durationMinutes;
			if (slotOverlapsAgreement(startMin, endMin, dateStr, agreements)) continue;
			if (slotOverlapsTrial(startMin, endMin, dateStr, trialLessons)) continue;
			result.push({
				date: dateStr,
				day_of_week: dow,
				start_time: sub.start_time,
				end_time: sub.end_time,
				teacher_user_id: teacherId,
			});
		}
	}
}

function compareFreeSlots(a: FreeSlotForTeacher, b: FreeSlotForTeacher): number {
	if (a.date !== b.date) return a.date < b.date ? -1 : 1;
	if (a.start_time !== b.start_time) return a.start_time < b.start_time ? -1 : 1;
	return a.teacher_user_id < b.teacher_user_id ? -1 : 1;
}

/**
 * Compute free time slots across multiple teachers within a date period.
 * Returns slots sorted chronologically by (date, start_time, teacher_user_id).
 *
 * A slot is "free" when it does not overlap with:
 *  - any lesson_agreement occurrence on that date for that teacher
 *  - any already scheduled trial lesson for that teacher on that date
 */
export function getFreeSlotsAcrossTeachers(
	periodStart: Date,
	periodEnd: Date,
	availabilityByTeacher: Map<string, AvailabilitySlot[]>,
	agreementsByTeacher: Map<string, ExistingAgreementForSlot[]>,
	trialLessonsByTeacher: Map<string, ExistingTrialLessonForSlot[]>,
	durationMinutes: number,
): FreeSlotForTeacher[] {
	const result: FreeSlotForTeacher[] = [];

	for (const date of iterateDates(periodStart, periodEnd)) {
		const dow = date.getDay();
		const dateStr = formatDateToDb(date);

		for (const [teacherId, availability] of availabilityByTeacher) {
			const dayAvail = availability.filter((a) => a.day_of_week === dow);
			if (dayAvail.length === 0) continue;

			appendFreeSlotsForTeacherDay(
				result,
				dateStr,
				dow,
				teacherId,
				dayAvail,
				agreementsByTeacher.get(teacherId) ?? [],
				trialLessonsByTeacher.get(teacherId) ?? [],
				durationMinutes,
			);
		}
	}

	result.sort(compareFreeSlots);
	return result;
}
