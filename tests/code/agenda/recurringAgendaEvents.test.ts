import { describe, expect, it } from 'bun:test';
import type { CalendarEvent } from '../../../src/components/agenda/types';
import { appendRecurringAgendaEvents } from '../../../src/lib/agenda/recurringAgendaEvents';
import { formatDateToDb } from '../../../src/lib/date/date-format';
import type { AgendaEventDeviationRow, AgendaEventRow } from '../../../src/types/agenda-events';
import type { LessonAgreementWithStudent } from '../../../src/types/lesson-agreements';

function mockAgendaEvent(overrides: Partial<AgendaEventRow> = {}): AgendaEventRow {
	return {
		id: 'event-1',
		title: 'Weekly lesson',
		description: null,
		start_date: '2025-02-17',
		start_time: '14:00:00',
		end_date: '2025-02-17',
		end_time: '15:00:00',
		is_all_day: false,
		recurring: true,
		recurring_frequency: 'weekly',
		recurring_end_date: '2025-02-28',
		color: '#10b981',
		source_type: 'manual',
		source_id: null,
		owner_user_id: 'user-1',
		created_by: null,
		updated_by: null,
		created_at: '2025-01-01T00:00:00Z',
		updated_at: '2025-01-01T00:00:00Z',
		...overrides,
	};
}

function mockDeviation(overrides: Partial<AgendaEventDeviationRow> = {}): AgendaEventDeviationRow {
	return {
		id: 'dev-1',
		event_id: 'event-1',
		original_date: '2025-02-17',
		original_start_time: '14:00:00',
		actual_date: '2025-02-18',
		actual_start_time: '15:00:00',
		spans_future_occurrences: false,
		spans_end_date: null,
		is_cancelled: false,
		needs_reschedule: false,
		cancellation_type: null,
		cancelled_participant_ids: null,
		title: null,
		description: null,
		color: null,
		participant_ids: null,
		reason: null,
		created_at: '2025-01-01T00:00:00Z',
		created_by: null,
		updated_at: '2025-01-01T00:00:00Z',
		updated_by: null,
		...overrides,
	};
}

function runAppend(
	ev: AgendaEventRow,
	rangeStart: Date,
	rangeEnd: Date,
	deviations: Map<string, AgendaEventDeviationRow> | undefined = undefined,
	recurringList: AgendaEventDeviationRow[] = [],
	agreement: LessonAgreementWithStudent | null = null,
	isLessonEvent = false,
	isLessonSource = false,
	noLessonPeriods: { start_date: string; end_date: string; name?: string | null }[] | undefined = undefined,
	schoolYearBounds: { start_month: number; end_month: number } | undefined = undefined,
): CalendarEvent[] {
	const events: CalendarEvent[] = [];
	appendRecurringAgendaEvents(
		ev,
		events,
		rangeStart,
		rangeEnd,
		deviations,
		recurringList,
		agreement,
		isLessonEvent,
		isLessonSource,
		noLessonPeriods,
		schoolYearBounds,
	);
	return events;
}

describe('appendRecurringAgendaEvents', () => {
	it('appends weekly occurrences inside the requested range', () => {
		const rangeStart = new Date('2025-02-01T00:00:00');
		const rangeEnd = new Date('2025-02-28T23:59:59');
		const events = runAppend(mockAgendaEvent(), rangeStart, rangeEnd);
		expect(events).toHaveLength(2);
		expect(formatDateToDb(events[0]?.start as Date)).toBe('2025-02-17');
		expect(formatDateToDb(events[1]?.start as Date)).toBe('2025-02-24');
		expect(events[0]?.resource.isDeviation).toBe(false);
	});

	it('applies a single-occurrence deviation to the moved date and time', () => {
		const rangeStart = new Date('2025-02-01T00:00:00');
		const rangeEnd = new Date('2025-02-28T23:59:59');
		const deviations = new Map([['2025-02-17', mockDeviation()]]);
		const events = runAppend(mockAgendaEvent(), rangeStart, rangeEnd, deviations);
		expect(events).toHaveLength(2);
		const moved = events[0];
		expect(moved).toBeDefined();
		expect(formatDateToDb(moved.start as Date)).toBe('2025-02-18');
		expect((moved.start as Date).getHours()).toBe(15);
		expect(moved.resource.isDeviation).toBe(true);
		expect(moved.resource.hasTimeOrDateChange).toBe(true);
		expect(formatDateToDb(events[1]?.start as Date)).toBe('2025-02-24');
	});

	it('marks a cancelled occurrence without moving it to another date', () => {
		const rangeStart = new Date('2025-02-01T00:00:00');
		const rangeEnd = new Date('2025-02-28T23:59:59');
		const deviations = new Map([
			[
				'2025-02-17',
				mockDeviation({
					is_cancelled: true,
					actual_date: '2025-02-17',
					actual_start_time: '14:00:00',
				}),
			],
		]);
		const events = runAppend(mockAgendaEvent(), rangeStart, rangeEnd, deviations);
		expect(events).toHaveLength(2);
		expect(formatDateToDb(events[0]?.start as Date)).toBe('2025-02-17');
		expect(events[0]?.resource.isCancelled).toBe(true);
		expect(events[0]?.resource.isDeviation).toBe(false);
	});

	it('applies a recurring deviation that spans future occurrences', () => {
		const rangeStart = new Date('2025-02-01T00:00:00');
		const rangeEnd = new Date('2025-02-28T23:59:59');
		const recurringDeviation = mockDeviation({
			id: 'dev-recurring',
			original_date: '2025-02-17',
			actual_date: '2025-02-18',
			actual_start_time: '16:00:00',
			spans_future_occurrences: true,
		});
		const events = runAppend(mockAgendaEvent(), rangeStart, rangeEnd, undefined, [recurringDeviation]);
		expect(events).toHaveLength(2);
		const first = events[0];
		expect(first).toBeDefined();
		expect(formatDateToDb(first.start as Date)).toBe('2025-02-18');
		expect((first.start as Date).getHours()).toBe(16);
		expect(formatDateToDb(events[1]?.start as Date)).toBe('2025-02-25');
		expect(events[1]?.resource.isDeviation).toBe(true);
	});

	it('uses agreement schedule data for lesson agreement events', () => {
		const agreement: LessonAgreementWithStudent = {
			id: 'agr-1',
			day_of_week: 1,
			start_time: '10:00',
			start_date: '2025-02-03',
			end_date: '2025-02-17',
			is_active: true,
			student_user_id: 'stu-1',
			lesson_type_id: 'lt-1',
			duration_minutes: 45,
			frequency: 'weekly',
			price_per_lesson: 30,
			notes: null,
			profiles: { first_name: 'Jan', last_name: 'Jansen', email: 'jan@example.com' },
			lesson_types: {
				id: 'lt-1',
				name: 'Piano',
				icon: 'piano',
				color: '#10b981',
				is_group_lesson: false,
			},
		};
		const rangeStart = new Date('2025-02-01T00:00:00');
		const rangeEnd = new Date('2025-02-28T23:59:59');
		const events = runAppend(
			mockAgendaEvent({
				source_type: 'lesson_agreement',
				source_id: 'agr-1',
				start_date: '2025-02-03',
				start_time: '14:00:00',
			}),
			rangeStart,
			rangeEnd,
			undefined,
			[],
			agreement,
			true,
			true,
		);
		expect(events).toHaveLength(3);
		const first = events[0];
		expect(first).toBeDefined();
		const start = first.start as Date;
		const end = first.end as Date;
		expect(start.getHours()).toBe(10);
		expect(end.getTime() - start.getTime()).toBe(45 * 60 * 1000);
		expect(first.resource.isLesson).toBe(true);
		expect(formatDateToDb(events[2]?.start as Date)).toBe('2025-02-17');
	});

	it('shifts lesson source occurrences during a no-lesson period', () => {
		const rangeStart = new Date('2025-07-01T00:00:00');
		const rangeEnd = new Date('2025-07-31T23:59:59');
		const events = runAppend(
			mockAgendaEvent({
				start_date: '2025-07-07',
				recurring_end_date: '2025-07-28',
			}),
			rangeStart,
			rangeEnd,
			undefined,
			[],
			null,
			true,
			true,
			[{ start_date: '2025-07-07', end_date: '2025-07-13', name: 'Summer break' }],
		);
		expect(events).toHaveLength(3);
		expect(formatDateToDb(events[0]?.start as Date)).toBe('2025-07-14');
		expect(events[0]?.resource.reason).toBe('Verschoven door lesvrije periode');
		expect(events[0]?.resource.hasTimeOrDateChange).toBe(true);
	});

	it('skips August lesson occurrences under Sep–Jul school year bounds', () => {
		const rangeStart = new Date('2025-08-01T00:00:00');
		const rangeEnd = new Date('2025-08-31T23:59:59');
		const events = runAppend(
			mockAgendaEvent({
				start_date: '2025-08-04',
				recurring_end_date: '2025-08-25',
			}),
			rangeStart,
			rangeEnd,
			undefined,
			[],
			null,
			true,
			true,
		);
		expect(events).toHaveLength(0);
	});

	it('keeps August lesson occurrences when school year spans the full calendar year', () => {
		const rangeStart = new Date('2025-08-01T00:00:00');
		const rangeEnd = new Date('2025-08-31T23:59:59');
		const events = runAppend(
			mockAgendaEvent({
				start_date: '2025-08-04',
				recurring_end_date: '2025-08-18',
			}),
			rangeStart,
			rangeEnd,
			undefined,
			[],
			null,
			true,
			true,
			undefined,
			{ start_month: 1, end_month: 12 },
		);
		expect(events).toHaveLength(3);
		expect(formatDateToDb(events[0]?.start as Date)).toBe('2025-08-04');
		expect(formatDateToDb(events[2]?.start as Date)).toBe('2025-08-18');
	});

	it('uses deviation title and color overrides on an occurrence', () => {
		const rangeStart = new Date('2025-02-01T00:00:00');
		const rangeEnd = new Date('2025-02-28T23:59:59');
		const deviations = new Map([
			[
				'2025-02-17',
				mockDeviation({
					title: 'Replacement lesson',
					color: '#ff0000',
					actual_date: '2025-02-17',
					actual_start_time: '14:00:00',
				}),
			],
		]);
		const events = runAppend(mockAgendaEvent(), rangeStart, rangeEnd, deviations);
		expect(events[0]?.title).toBe('Replacement lesson');
		expect(events[0]?.resource.color).toBe('#ff0000');
		expect(events[0]?.resource.hasTimeOrDateChange).toBe(false);
	});

	it('keeps biweekly phase-shift occurrences whose grid date falls before the visible range', () => {
		const rangeStart = new Date('2026-11-01T00:00:00');
		const rangeEnd = new Date('2026-11-30T23:59:59');
		const recurringDeviation = mockDeviation({
			id: 'dev-phase',
			original_date: '2025-10-28',
			actual_date: '2025-11-04',
			original_start_time: '20:00:00',
			actual_start_time: '20:00:00',
			spans_future_occurrences: true,
			reason: 'import: schedule phase shift',
		});
		const events = runAppend(
			mockAgendaEvent({
				title: 'Spelen in een Band 15-18 dinsdag 20:00',
				start_date: '2025-10-14',
				start_time: '20:00:00',
				end_date: '2025-10-14',
				end_time: '21:00:00',
				recurring_frequency: 'biweekly',
				recurring_end_date: null,
				source_type: 'lesson_group',
				source_id: 'group-1',
			}),
			rangeStart,
			rangeEnd,
			undefined,
			[recurringDeviation],
			null,
			false,
			true,
		);
		expect(events.map((event) => formatDateToDb(event.start as Date))).toEqual(['2026-11-03', '2026-11-17']);
	});
});
