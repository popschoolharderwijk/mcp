import { describe, expect, it } from 'bun:test';
import { generateAgendaEvents } from '../../../src/lib/agenda/eventGenerators';
import { formatAgendaEventSaveError } from '../../../src/lib/agenda/formatAgendaEventSaveError';
import { formatDateToDb } from '../../../src/lib/date/date-format';
import type { AgendaEventRow } from '../../../src/types/agenda-events';
import type { LessonAgreementWithStudent } from '../../../src/types/lesson-agreements';

function mockAgendaEvent(overrides: Partial<AgendaEventRow> = {}): AgendaEventRow {
	return {
		id: 'event-1',
		title: 'Proefles',
		description: null,
		start_date: '2025-02-17',
		start_time: '14:00:00',
		end_date: '2025-02-17',
		end_time: '15:00:00',
		is_all_day: false,
		recurring: false,
		recurring_frequency: null,
		recurring_end_date: null,
		color: null,
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

describe('generateAgendaEvents', () => {
	it('returns a single non-recurring event inside the range', () => {
		const rangeStart = new Date('2025-02-01T00:00:00');
		const rangeEnd = new Date('2025-02-28T23:59:59');
		const events = generateAgendaEvents([mockAgendaEvent()], rangeStart, rangeEnd, new Map());

		expect(events).toHaveLength(1);
		expect(events[0]?.title).toBe('Proefles');
		expect(formatDateToDb(events[0]?.start as Date)).toBe('2025-02-17');
	});

	it('skips non-recurring events outside the range', () => {
		const rangeStart = new Date('2025-03-01T00:00:00');
		const rangeEnd = new Date('2025-03-31T23:59:59');
		const events = generateAgendaEvents([mockAgendaEvent()], rangeStart, rangeEnd, new Map());

		expect(events).toHaveLength(0);
	});

	it('generates weekly recurring events in range', () => {
		const rangeStart = new Date('2025-02-01T00:00:00');
		const rangeEnd = new Date('2025-02-28T23:59:59');
		const events = generateAgendaEvents(
			[
				mockAgendaEvent({
					recurring: true,
					recurring_frequency: 'weekly',
					recurring_end_date: '2025-02-28',
				}),
			],
			rangeStart,
			rangeEnd,
			new Map(),
		);

		expect(events).toHaveLength(2);
		expect(formatDateToDb(events[0]?.start as Date)).toBe('2025-02-17');
		expect(formatDateToDb(events[1]?.start as Date)).toBe('2025-02-24');
	});

	it('defaults end time to one hour when end_time is missing', () => {
		const rangeStart = new Date('2025-02-01T00:00:00');
		const rangeEnd = new Date('2025-02-28T23:59:59');
		const events = generateAgendaEvents(
			[mockAgendaEvent({ end_time: null, start_time: '14:00:00' })],
			rangeStart,
			rangeEnd,
			new Map(),
		);
		expect(events).toHaveLength(1);
		const event = events[0];
		expect(event).toBeDefined();
		expect((event.end as Date).getTime() - (event.start as Date).getTime()).toBe(60 * 60 * 1000);
	});

	it('marks lesson agreement events as lessons', () => {
		const agreement: LessonAgreementWithStudent = {
			id: 'agr-1',
			day_of_week: 1,
			start_time: '14:00',
			start_date: '2025-02-01',
			end_date: '2025-02-28',
			is_active: true,
			student_user_id: 'stu-1',
			lesson_type_id: 'lt-1',
			duration_minutes: 60,
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
		const events = generateAgendaEvents(
			[
				mockAgendaEvent({
					recurring: true,
					recurring_frequency: 'weekly',
					source_type: 'lesson_agreement',
					source_id: 'agr-1',
					start_date: '2025-02-03',
					start_time: '14:00:00',
					end_time: '15:00:00',
				}),
			],
			rangeStart,
			rangeEnd,
			new Map(),
			undefined,
			new Map([['agr-1', agreement]]),
		);
		expect(events.length).toBe(4);
		expect(events[0]?.resource.isLesson).toBe(true);
		expect(events[0]?.resource.agreementId).toBe('agr-1');
	});

	it('generates daily recurring events in range', () => {
		const rangeStart = new Date('2025-02-10T00:00:00');
		const rangeEnd = new Date('2025-02-14T23:59:59');
		const events = generateAgendaEvents(
			[
				mockAgendaEvent({
					recurring: true,
					recurring_frequency: 'daily',
					recurring_end_date: '2025-02-14',
					start_date: '2025-02-10',
				}),
			],
			rangeStart,
			rangeEnd,
			new Map(),
		);
		expect(events).toHaveLength(5);
		expect(formatDateToDb(events[0]?.start as Date)).toBe('2025-02-10');
		expect(formatDateToDb(events[4]?.start as Date)).toBe('2025-02-14');
	});

	it('generates biweekly recurring events in range', () => {
		const rangeStart = new Date('2025-02-01T00:00:00');
		const rangeEnd = new Date('2025-03-31T23:59:59');
		const events = generateAgendaEvents(
			[
				mockAgendaEvent({
					recurring: true,
					recurring_frequency: 'biweekly',
					recurring_end_date: '2025-03-31',
				}),
			],
			rangeStart,
			rangeEnd,
			new Map(),
		);
		expect(events).toHaveLength(4);
		expect(formatDateToDb(events[0]?.start as Date)).toBe('2025-02-17');
		expect(formatDateToDb(events[1]?.start as Date)).toBe('2025-03-03');
		expect(formatDateToDb(events[2]?.start as Date)).toBe('2025-03-17');
		expect(formatDateToDb(events[3]?.start as Date)).toBe('2025-03-31');
	});

	it('treats recurring without frequency as non-recurring', () => {
		const rangeStart = new Date('2025-02-01T00:00:00');
		const rangeEnd = new Date('2025-02-28T23:59:59');
		const events = generateAgendaEvents(
			[mockAgendaEvent({ recurring: true, recurring_frequency: null })],
			rangeStart,
			rangeEnd,
			new Map(),
		);
		expect(events).toHaveLength(1);
	});
});

describe('formatAgendaEventSaveError', () => {
	it('returns Dutch message for no-change saves', () => {
		expect(formatAgendaEventSaveError(new Error('NO_CHANGES'))).toBe('Er zijn geen wijzigingen om op te slaan.');
	});

	it('returns permission message for row-level security errors', () => {
		expect(formatAgendaEventSaveError(new Error('row-level security policy'))).toBe(
			'Je hebt geen toestemming om deze deelnemer toe te voegen',
		);
	});

	it('falls back to default message', () => {
		expect(formatAgendaEventSaveError(new Error('unknown'))).toBe('unknown');
		expect(formatAgendaEventSaveError(null)).toBe('Opslaan mislukt');
	});

	it('reads message from plain objects', () => {
		expect(formatAgendaEventSaveError({ message: 'Validation failed' })).toBe('Validation failed');
	});

	it('returns the default message when the error message is empty', () => {
		expect(formatAgendaEventSaveError(new Error(''))).toBe('Opslaan mislukt');
	});
});
