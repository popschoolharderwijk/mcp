import type { CalendarEvent, CalendarEventResource, MergedSlotMember } from '@/components/agenda/types';
import { joinFirstNames } from '@/lib/display-name';
import type { User } from '@/types/users';

function isMergeableLessonEvent(event: CalendarEvent): boolean {
	return (
		Boolean(event.resource.isLesson) &&
		event.resource.sourceType === 'lesson_agreement' &&
		!event.resource.isGroupLesson
	);
}

function slotKey(event: CalendarEvent): string {
	return `${event.start?.getTime() ?? 0}|${event.end?.getTime() ?? 0}`;
}

function collectStudentNames(event: CalendarEvent): string[] {
	return event.resource.studentName
		.split(' & ')
		.map((name) => name.trim())
		.filter(Boolean);
}

function collectStudentUsers(event: CalendarEvent): User[] {
	if (event.resource.users?.length) return event.resource.users;
	if (event.resource.user) return [event.resource.user];
	return [];
}

function resolveMergedTitle(
	studentLabel: string,
	teacherName: string | undefined,
	viewerIsTeacher: boolean | undefined,
): string {
	if (viewerIsTeacher === false) return teacherName ?? studentLabel;
	return studentLabel;
}

function deviationPriority(event: CalendarEvent): number {
	return (event.resource.hasTimeOrDateChange ? 2 : 0) + (event.resource.isDeviation ? 1 : 0);
}

function pickSameSlotMergePrimary(group: CalendarEvent[]): CalendarEvent {
	return [...group].sort((left, right) => {
		const priorityDiff = deviationPriority(right) - deviationPriority(left);
		if (priorityDiff !== 0) return priorityDiff;
		return left.resource.studentName.localeCompare(right.resource.studentName, 'nl');
	})[0];
}

function buildMergedSlotMembers(group: CalendarEvent[]): MergedSlotMember[] {
	return group.flatMap((event) => {
		const eventId = event.resource.eventId;
		if (!eventId) return [];
		return [
			{
				eventId,
				originalDate: event.resource.originalDate,
				deviationId: event.resource.deviationId,
				hasTimeOrDateChange: event.resource.hasTimeOrDateChange,
				isDeviation: event.resource.isDeviation,
				isCancelled: event.resource.isCancelled,
			},
		];
	});
}

/** Members that can be restored to their original lesson slot. */
export function getRevertibleMergedSlotMembers(members: MergedSlotMember[] | undefined): MergedSlotMember[] {
	if (!members?.length) return [];
	return members.filter(
		(member) =>
			Boolean(member.isDeviation || member.hasTimeOrDateChange) &&
			Boolean(member.eventId) &&
			Boolean(member.originalDate),
	);
}

function sortUsersByDisplayName(users: User[]): User[] {
	return [...users].sort((left, right) => {
		const leftName = `${left.first_name ?? ''} ${left.last_name ?? ''}`.trim();
		const rightName = `${right.first_name ?? ''} ${right.last_name ?? ''}`.trim();
		return leftName.localeCompare(rightName, 'nl');
	});
}

function collectMergedStudents(group: CalendarEvent[]): { studentNames: string[]; studentUsers: User[] } {
	const nameSet = new Set<string>();
	const usersById = new Map<string, User>();
	for (const event of group) {
		for (const name of collectStudentNames(event)) nameSet.add(name);
		for (const user of collectStudentUsers(event)) usersById.set(user.user_id, user);
	}
	return {
		studentNames: [...nameSet].sort(),
		studentUsers: sortUsersByDisplayName([...usersById.values()]),
	};
}

function resolveGroupSlotFlags(group: CalendarEvent[], primary: CalendarEvent) {
	return {
		isDeviation: group.some((event) => event.resource.isDeviation) || primary.resource.isDeviation,
		hasTimeOrDateChange:
			group.some((event) => event.resource.hasTimeOrDateChange) || Boolean(primary.resource.hasTimeOrDateChange),
		isCancelled: group.some((event) => event.resource.isCancelled) || primary.resource.isCancelled,
	};
}

function buildMultiStudentParticipants(teacherUserId: string | undefined, studentUsers: User[]): string[] {
	const studentIds = studentUsers.map((user) => user.user_id);
	return [...new Set([...(teacherUserId ? [teacherUserId] : []), ...studentIds])];
}

function buildMergedResourceBase(
	primary: CalendarEvent,
	group: CalendarEvent[],
	studentNames: string[],
): CalendarEventResource {
	return {
		...primary.resource,
		studentName: studentNames.join(' & '),
		isSameSlotMerge: true,
		mergedSlotMembers: buildMergedSlotMembers(group),
		...resolveGroupSlotFlags(group, primary),
	};
}

function buildMergedResource(
	primary: CalendarEvent,
	group: CalendarEvent[],
	studentNames: string[],
	studentUsers: User[],
): CalendarEventResource {
	const base = buildMergedResourceBase(primary, group, studentNames);
	if (studentNames.length <= 1) {
		return { ...base, isDuoLesson: false };
	}
	const teacherUserId = primary.resource.teacherUserId;
	return {
		...base,
		isDuoLesson: true,
		studentCount: studentNames.length,
		users: studentUsers,
		user: undefined,
		participants: buildMultiStudentParticipants(teacherUserId, studentUsers),
		participantCount: studentNames.length + (teacherUserId ? 1 : 0),
		participantNames: studentNames,
	};
}

function mergeLessonSlotGroup(group: CalendarEvent[]): CalendarEvent {
	const { studentNames, studentUsers } = collectMergedStudents(group);
	const primary = pickSameSlotMergePrimary(group);
	const titleLabel =
		studentNames.length > 1 && studentUsers.length > 0 ? joinFirstNames(studentUsers) : studentNames.join(' & ');
	return {
		...primary,
		title: resolveMergedTitle(titleLabel, primary.resource.teacherName, primary.resource.viewerIsTeacher),
		resource: buildMergedResource(primary, group, studentNames, studentUsers),
	};
}

function groupMergeableEvents(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
	const groups = new Map<string, CalendarEvent[]>();
	for (const event of events) {
		const key = slotKey(event);
		const existing = groups.get(key);
		if (existing) existing.push(event);
		else groups.set(key, [event]);
	}
	return groups;
}

/** Collapse lesson_agreement events that share an exact start/end into one multi-student lesson. */
export function mergeSameSlotLessonEvents(events: CalendarEvent[]): CalendarEvent[] {
	const mergeable = events.filter(isMergeableLessonEvent);
	const passthrough = events.filter((event) => !isMergeableLessonEvent(event));
	const merged = [...groupMergeableEvents(mergeable).values()].map((group) =>
		group.length === 1 ? group[0] : mergeLessonSlotGroup(group),
	);
	return [...passthrough, ...merged].sort(
		(left, right) => (left.start?.getTime() ?? 0) - (right.start?.getTime() ?? 0),
	);
}
