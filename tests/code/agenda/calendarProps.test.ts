import { describe, expect, it } from 'bun:test';
import type { CalendarEvent } from '../../../src/components/agenda/types';
import { getCalendarProps } from '../../../src/lib/agenda/calendarProps';
import { AVAILABILITY_CONFIG } from '../../../src/lib/availability';

function mockCalendarEvent(resourceOverrides: Partial<CalendarEvent['resource']> = {}): CalendarEvent {
	return {
		title: 'Piano les',
		start: new Date('2026-02-17T14:00:00'),
		end: new Date('2026-02-17T15:00:00'),
		resource: {
			type: 'agreement',
			agreementId: 'agr-1',
			studentName: 'Anna Bakker',
			lessonTypeName: 'Piano',
			lessonTypeColor: '#ff0000',
			lessonTypeIcon: null,
			isDeviation: false,
			isCancelled: false,
			isGroupLesson: false,
			...resourceOverrides,
		},
	};
}

const baseParams = {
	events: [mockCalendarEvent()],
	currentView: 'week' as const,
	currentDate: new Date('2026-02-17T12:00:00'),
	min: new Date(0, 0, 0, AVAILABILITY_CONFIG.START_HOUR, 0, 0),
	max: new Date(0, 0, 0, AVAILABILITY_CONFIG.END_HOUR, 0, 0),
	scrollToTime: new Date('2026-02-17T09:00:00'),
	onEventDrop: () => undefined,
	onSelectEvent: () => undefined,
	onSelectSlot: () => undefined,
	setCurrentView: () => undefined,
	setCurrentDate: () => undefined,
};

describe('getCalendarProps', () => {
	it('disables editing interactions when the viewer cannot edit', () => {
		const props = getCalendarProps({
			...baseParams,
			canEdit: false,
			isOwnAgenda: true,
		});

		expect(props.selectable).toBe(false);
		expect(props.onSelectEvent).toBeUndefined();
		expect(props.onSelectSlot).toBeUndefined();
		expect(props.onEventDrop).toBeUndefined();
		expect(props.draggableAccessor()).toBe(false);
		expect(props.resizableAccessor()).toBe(false);
	});

	it('enables slot selection only on the viewer own editable agenda', () => {
		const onSelectEvent = () => undefined;
		const onSelectSlot = () => undefined;
		const onEventDrop = () => undefined;

		const ownAgendaProps = getCalendarProps({
			...baseParams,
			canEdit: true,
			isOwnAgenda: true,
			onSelectEvent,
			onSelectSlot,
			onEventDrop,
		});
		expect(ownAgendaProps.selectable).toBe(true);
		expect(ownAgendaProps.onSelectEvent).toBe(onSelectEvent);
		expect(ownAgendaProps.onSelectSlot).toBe(onSelectSlot);
		expect(ownAgendaProps.onEventDrop).toBe(onEventDrop);
		expect(ownAgendaProps.draggableAccessor()).toBe(true);

		const otherAgendaProps = getCalendarProps({
			...baseParams,
			canEdit: true,
			isOwnAgenda: false,
			onSelectEvent,
			onSelectSlot,
			onEventDrop,
		});
		expect(otherAgendaProps.selectable).toBe(false);
		expect(otherAgendaProps.onSelectEvent).toBeUndefined();
		expect(otherAgendaProps.onSelectSlot).toBeUndefined();
		expect(otherAgendaProps.onEventDrop).toBe(onEventDrop);
	});

	it('returns no day styling outside no-lesson periods', () => {
		const props = getCalendarProps({
			...baseParams,
			canEdit: false,
			isOwnAgenda: false,
			noLessonPeriods: [{ start_date: '2026-07-01', end_date: '2026-07-31', name: 'Zomervakantie' }],
		});

		expect(props.dayPropGetter(new Date('2026-02-17T12:00:00'))).toEqual({});
		expect(props.slotPropGetter(new Date('2026-02-17T12:00:00'))).toEqual({});
	});

	it('marks days inside no-lesson periods with accessibility labels', () => {
		const props = getCalendarProps({
			...baseParams,
			canEdit: false,
			isOwnAgenda: false,
			noLessonPeriods: [{ start_date: '2026-07-01', end_date: '2026-07-31', name: 'Zomervakantie' }],
		});

		expect(props.dayPropGetter(new Date('2026-07-15T12:00:00'))).toEqual({
			className: 'rbc-day-no-lesson',
			'aria-label': 'Lesvrij: Zomervakantie',
		});
	});

	it('uses a generic no-lesson label when the period has no name', () => {
		const props = getCalendarProps({
			...baseParams,
			canEdit: false,
			isOwnAgenda: false,
			noLessonPeriods: [{ start_date: '2026-12-24', end_date: '2026-12-26', name: null }],
		});

		expect(props.dayPropGetter(new Date('2026-12-25T12:00:00'))).toEqual({
			className: 'rbc-day-no-lesson',
			'aria-label': 'Lesvrije periode',
		});
	});

	it('exposes calendar accessors and availability bounds', () => {
		const event = mockCalendarEvent({
			isLesson: true,
			teacherName: 'Piet Docent',
		});
		const props = getCalendarProps({
			...baseParams,
			canEdit: false,
			isOwnAgenda: false,
		});

		expect(props.view).toBe('week');
		expect(props.date).toEqual(baseParams.currentDate);
		expect(props.scrollToTime).toEqual(baseParams.scrollToTime);
		expect(props.startAccessor(event)).toEqual(event.start);
		expect(props.endAccessor(event)).toEqual(event.end);
		expect(props.min).toEqual(baseParams.min);
		expect(props.max).toEqual(baseParams.max);
		expect(props.eventPropGetter(event).style?.backgroundColor).toBe('#ff0000');
		expect(props.tooltipAccessor(event)).toBe('Piano\nDocent: Piet Docent\nLeerling: Anna Bakker');
	});
});
