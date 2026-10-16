import { describe, expect, it } from 'bun:test';
import type { CalendarEvent } from '../../../src/components/agenda/types';
import { mergeSameSlotLessonEvents } from '../../../src/lib/agenda/mergeSameSlotLessonEvents';
import type { User } from '../../../src/types/users';

const start = new Date('2026-09-07T14:00:00');
const end = new Date('2026-09-07T14:30:00');

const anna: User = {
	user_id: 'stu-a',
	first_name: 'Anna',
	last_name: 'Bakker',
	email: 'anna@example.com',
	avatar_url: null,
	phone_number: null,
};

const bob: User = {
	user_id: 'stu-b',
	first_name: 'Bob',
	last_name: 'Jansen',
	email: 'bob@example.com',
	avatar_url: null,
	phone_number: null,
};

function lessonEvent(
	overrides: { title?: string; start?: Date; end?: Date; resource?: Partial<CalendarEvent['resource']> } = {},
): CalendarEvent {
	return {
		title: overrides.title ?? 'Anna Bakker',
		start: overrides.start ?? start,
		end: overrides.end ?? end,
		resource: {
			type: 'agenda',
			agreementId: 'agr-1',
			eventId: 'event-1',
			studentName: 'Anna Bakker',
			lessonTypeName: 'Drumles',
			lessonTypeColor: '#000',
			lessonTypeIcon: null,
			isDeviation: false,
			isCancelled: false,
			isGroupLesson: false,
			isLesson: true,
			sourceType: 'lesson_agreement',
			teacherName: 'Piet Docent',
			teacherUserId: 'tea-1',
			viewerIsTeacher: true,
			user: anna,
			...overrides.resource,
		},
	};
}

describe('mergeSameSlotLessonEvents', () => {
	it('leaves a single lesson unchanged', () => {
		const events = [lessonEvent({})];
		expect(mergeSameSlotLessonEvents(events)).toEqual(events);
	});

	it('merges two lesson_agreement events in the exact same slot into one multi-student lesson', () => {
		const events = [
			lessonEvent({
				title: 'Anna Bakker',
				resource: { agreementId: 'agr-1', eventId: 'event-1', studentName: 'Anna Bakker', user: anna },
			}),
			lessonEvent({
				title: 'Bob Jansen',
				resource: {
					agreementId: 'agr-2',
					eventId: 'event-2',
					studentName: 'Bob Jansen',
					user: bob,
				},
			}),
		];

		const result = mergeSameSlotLessonEvents(events);
		expect(result).toHaveLength(1);
		expect(result[0]?.title).toBe('Anna & Bob');
		expect(result[0]?.resource.studentName).toBe('Anna Bakker & Bob Jansen');
		expect(result[0]?.resource.isDuoLesson).toBe(true);
		expect(result[0]?.resource.studentCount).toBe(2);
		expect(result[0]?.resource.users).toHaveLength(2);
		expect(result[0]?.resource.participants).toEqual(['tea-1', 'stu-a', 'stu-b']);
		expect(result[0]?.resource.isSameSlotMerge).toBe(true);
		expect(result[0]?.resource.mergedSlotMembers?.map((member) => member.eventId).sort()).toEqual([
			'event-1',
			'event-2',
		]);
		expect(result[0]?.resource.user).toBeUndefined();
	});

	it('prefers a time-changed lesson as primary so Terugzetten stays available', () => {
		const events = [
			lessonEvent({
				title: 'Anna Bakker',
				resource: {
					agreementId: 'agr-1',
					eventId: 'event-anna',
					studentName: 'Anna Bakker',
					user: anna,
					isDeviation: false,
				},
			}),
			lessonEvent({
				title: 'Bob Jansen',
				resource: {
					agreementId: 'agr-2',
					eventId: 'event-bob',
					studentName: 'Bob Jansen',
					user: bob,
					isDeviation: true,
					hasTimeOrDateChange: true,
					deviationId: 'dev-bob',
					originalDate: '2026-09-07',
					originalStartTime: '15:00:00',
				},
			}),
		];

		const result = mergeSameSlotLessonEvents(events);
		expect(result).toHaveLength(1);
		expect(result[0]?.resource.eventId).toBe('event-bob');
		expect(result[0]?.resource.isDeviation).toBe(true);
		expect(result[0]?.resource.hasTimeOrDateChange).toBe(true);
		expect(result[0]?.resource.deviationId).toBe('dev-bob');
		expect(result[0]?.resource.mergedSlotMembers).toHaveLength(2);
	});

	it('does not merge lessons in different slots', () => {
		const events = [
			lessonEvent({}),
			lessonEvent({
				title: 'Bob Jansen',
				start: new Date('2026-09-07T15:00:00'),
				end: new Date('2026-09-07T15:30:00'),
				resource: { studentName: 'Bob Jansen', user: bob, eventId: 'event-2' },
			}),
		];

		expect(mergeSameSlotLessonEvents(events)).toHaveLength(2);
	});

	it('does not merge non-lesson events in the same slot', () => {
		const events = [
			lessonEvent({}),
			lessonEvent({
				title: 'Afspraak',
				resource: {
					studentName: 'Afspraak',
					isLesson: false,
					sourceType: 'manual',
					eventId: 'event-manual',
				},
			}),
		];

		expect(mergeSameSlotLessonEvents(events)).toHaveLength(2);
	});

	it('shows the teacher title when the viewer is a student of a merged slot', () => {
		const events = [
			lessonEvent({
				resource: {
					studentName: 'Anna Bakker',
					user: anna,
					viewerIsTeacher: false,
					teacherName: 'Piet Docent',
				},
			}),
			lessonEvent({
				resource: {
					agreementId: 'agr-2',
					eventId: 'event-2',
					studentName: 'Bob Jansen',
					user: bob,
					viewerIsTeacher: false,
					teacherName: 'Piet Docent',
				},
			}),
		];

		const result = mergeSameSlotLessonEvents(events);
		expect(result).toHaveLength(1);
		expect(result[0]?.title).toBe('Piet Docent');
		expect(result[0]?.resource.studentName).toBe('Anna Bakker & Bob Jansen');
	});

	it('propagates cancelled and collected users from group members', () => {
		const events = [
			lessonEvent({
				resource: {
					eventId: 'event-1',
					studentName: 'Anna Bakker',
					users: [anna],
					user: undefined,
					teacherUserId: undefined,
					isCancelled: true,
				},
			}),
			lessonEvent({
				resource: {
					agreementId: 'agr-2',
					eventId: 'event-2',
					studentName: 'Bob Jansen',
					users: [bob],
					user: undefined,
					teacherUserId: undefined,
				},
			}),
		];

		const result = mergeSameSlotLessonEvents(events);
		expect(result).toHaveLength(1);
		expect(result[0]?.resource.isCancelled).toBe(true);
		expect(result[0]?.resource.participants).toEqual(['stu-a', 'stu-b']);
		expect(result[0]?.resource.participantCount).toBe(2);
		expect(result[0]?.resource.participantNames).toEqual(['Anna Bakker', 'Bob Jansen']);
	});
});
