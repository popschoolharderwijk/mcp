import type { LessonFrequency } from '../courses/types';
import { formatYmd } from '../shared/dateHelpers';
import { ensureMappedId, type MongoIdMap } from '../shared/idMapHelpers';
import type { AgreementCourseSqlRow } from './types';

const DAY_NAMES_NL = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'] as const;

/**
 * Biweekly phase for an anchor date on `dayOfWeek` (0–13 day-of-epoch bucket).
 * Same wall-clock slot on opposite biweekly weeks must not share one lesson_group.
 */
function biweeklyPhaseKey(phaseAnchorDate: string, dayOfWeek: number): string {
	const first = computeGroupAgendaStartDate(phaseAnchorDate, dayOfWeek);
	const [year, month, day] = first.split('-').map(Number);
	const utcDay = Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
	return String(((utcDay % 14) + 14) % 14);
}

/**
 * Prefer the latest Mongo lesson date when present; otherwise the schedule slot date.
 * startDate alone splits classmates who joined on different calendar years of the same grid.
 */
function biweeklyPhaseAnchorDate(
	row: Pick<AgreementCourseSqlRow, 'mongoOid' | 'scheduleSlotDate'>,
	datesByAgreement?: ReadonlyMap<string, readonly string[]>,
): string {
	const dates = datesByAgreement?.get(row.mongoOid);
	if (dates != null && dates.length > 0) {
		return dates[dates.length - 1] ?? row.scheduleSlotDate;
	}
	return row.scheduleSlotDate;
}

/** Stable id-map key for a group slot (not a Mongo oid). */
export function groupLessonSlotKey(
	row: Pick<
		AgreementCourseSqlRow,
		| 'teacherUserId'
		| 'lessonTypeId'
		| 'dayOfWeek'
		| 'startTime'
		| 'durationMinutes'
		| 'frequency'
		| 'mongoOid'
		| 'scheduleSlotDate'
	>,
	datesByAgreement?: ReadonlyMap<string, readonly string[]>,
): string {
	const parts = [
		row.teacherUserId,
		row.lessonTypeId,
		String(row.dayOfWeek),
		row.startTime,
		String(row.durationMinutes),
		row.frequency,
	];
	if (row.frequency === 'biweekly') {
		parts.push(biweeklyPhaseKey(biweeklyPhaseAnchorDate(row, datesByAgreement), row.dayOfWeek));
	}
	return parts.join('|');
}

export function buildGroupLessonName(courseName: string, dayOfWeek: number, startTime: string): string {
	const day = DAY_NAMES_NL[dayOfWeek] ?? `dag-${dayOfWeek}`;
	const time = startTime.slice(0, 5);
	const base = courseName.trim() || 'Groepsles';
	return `${base} ${day} ${time}`;
}

function parseStartTimeParts(startTime: string): { hours: number; minutes: number; seconds: number } {
	const [hoursPart, minutesPart, secondsPart] = startTime.split(':');
	return {
		hours: Number(hoursPart),
		minutes: Number(minutesPart),
		seconds: Number(secondsPart ?? '0'),
	};
}

/** Align YYYY-MM-DD to the next matching weekday (0=Sun … 6=Sat), same calendar rules as lesson groups UI. */
export function computeGroupAgendaStartDate(startDate: string, dayOfWeek: number): string {
	const start = new Date(`${startDate}T12:00:00`);
	const offset = (dayOfWeek - start.getDay() + 7) % 7;
	start.setDate(start.getDate() + offset);
	return formatYmd(start);
}

export function computeGroupAgendaEndTime(startTime: string, durationMinutes: number): string {
	const { hours, minutes, seconds } = parseStartTimeParts(startTime);
	const total = hours * 60 + minutes + durationMinutes;
	const endHours = Math.floor(total / 60) % 24;
	const endMinutes = total % 60;
	return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** End calendar date for an agenda occurrence; rolls forward when duration crosses midnight. */
export function computeGroupAgendaEndDate(agendaStartDate: string, startTime: string, durationMinutes: number): string {
	const { hours, minutes } = parseStartTimeParts(startTime);
	const dayOffset = Math.floor((hours * 60 + minutes + durationMinutes) / (24 * 60));
	if (dayOffset === 0) return agendaStartDate;
	const end = new Date(`${agendaStartDate}T12:00:00`);
	end.setDate(end.getDate() + dayOffset);
	return formatYmd(end);
}

export type ImportLessonGroupRow = {
	lessonGroupId: string;
	name: string;
	lessonTypeId: string;
	teacherUserId: string;
	durationMinutes: number;
	frequency: LessonFrequency;
	pricePerLesson: number;
	dayOfWeek: number;
	startTime: string;
	startDate: string;
	endDate: string | null;
	agendaStartDate: string;
	agendaEndDate: string;
	agendaEndTime: string;
};

function resolveGroupDateRange(members: AgreementCourseSqlRow[]): {
	startDate: string;
	endDate: string | null;
	pricePerLesson: number;
} {
	const startDates = members.map((member) => member.startDate).sort();
	const startDate = startDates[0] ?? members[0].startDate;
	const endDates = members.map((member) => member.endDate);
	const endDate = endDates.every((value) => value != null) ? ([...endDates].sort().at(-1) ?? null) : null;
	const pricePerLesson = [...members].sort((left, right) => left.studentUserId.localeCompare(right.studentUserId))[0]
		.pricePerLesson;
	return { startDate, endDate, pricePerLesson };
}

export type ImportLessonGroupMemberRow = {
	lessonGroupId: string;
	studentUserId: string;
	joinedDate: string;
	leftDate: string | null;
};

/** One membership per (group, student); join = earliest start, leave = null if any open else latest end. */
export function coalesceLessonGroupMembers(rows: AgreementCourseSqlRow[]): ImportLessonGroupMemberRow[] {
	const byKey = new Map<string, AgreementCourseSqlRow[]>();
	for (const row of rows) {
		if (row.lessonGroupId == null) continue;
		const key = `${row.lessonGroupId}|${row.studentUserId}`;
		const existing = byKey.get(key);
		if (existing) existing.push(row);
		else byKey.set(key, [row]);
	}
	return [...byKey.entries()]
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([, members]) => {
			const { startDate, endDate } = resolveGroupDateRange(members);
			return {
				lessonGroupId: members[0].lessonGroupId as string,
				studentUserId: members[0].studentUserId,
				joinedDate: startDate,
				leftDate: endDate,
			};
		});
}

/** Assign shared lesson_group ids to group-course agreements; update id-map. */
export function attachLessonGroupsToAgreementRows(
	rows: AgreementCourseSqlRow[],
	idMap: MongoIdMap,
	createId: () => string,
	datesByAgreement?: ReadonlyMap<string, readonly string[]>,
): { rows: AgreementCourseSqlRow[]; idMap: MongoIdMap; groups: ImportLessonGroupRow[] } {
	let nextMap = idMap;
	const membersBySlot = new Map<string, AgreementCourseSqlRow[]>();

	for (const row of rows) {
		if (!row.isGroupLesson) continue;
		const key = row.groupSlotKey ?? groupLessonSlotKey(row, datesByAgreement);
		const existing = membersBySlot.get(key);
		if (existing) existing.push(row);
		else membersBySlot.set(key, [row]);
	}

	const groupIdBySlot = new Map<string, string>();
	const groups: ImportLessonGroupRow[] = [];

	for (const [slotKey, members] of membersBySlot) {
		const ensured = ensureMappedId(nextMap, 'lesson_group', slotKey, createId);
		nextMap = ensured.map;
		groupIdBySlot.set(slotKey, ensured.id);

		const primary = members[0];
		const { startDate, endDate, pricePerLesson } = resolveGroupDateRange(members);
		const name = buildGroupLessonName(primary.courseName ?? 'Groepsles', primary.dayOfWeek, primary.startTime);
		const agendaStartDate = computeGroupAgendaStartDate(startDate, primary.dayOfWeek);
		groups.push({
			lessonGroupId: ensured.id,
			name,
			lessonTypeId: primary.lessonTypeId,
			teacherUserId: primary.teacherUserId,
			durationMinutes: primary.durationMinutes,
			frequency: primary.frequency,
			pricePerLesson,
			dayOfWeek: primary.dayOfWeek,
			startTime: primary.startTime,
			startDate,
			endDate,
			agendaStartDate,
			agendaEndDate: computeGroupAgendaEndDate(agendaStartDate, primary.startTime, primary.durationMinutes),
			agendaEndTime: computeGroupAgendaEndTime(primary.startTime, primary.durationMinutes),
		});
	}

	const nextRows = rows.map((row) => {
		if (!row.isGroupLesson) {
			return { ...row, lessonGroupId: null, groupSlotKey: null };
		}
		const slotKey = row.groupSlotKey ?? groupLessonSlotKey(row, datesByAgreement);
		return {
			...row,
			lessonGroupId: groupIdBySlot.get(slotKey) ?? null,
			groupSlotKey: slotKey,
		};
	});

	return { rows: nextRows, idMap: nextMap, groups };
}
