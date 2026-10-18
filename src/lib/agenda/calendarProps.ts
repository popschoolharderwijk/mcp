import type React from 'react';
import type { View } from 'react-big-calendar';
import { AgendaEvent } from '@/components/agenda/AgendaEvent';
import { agendaMessages, getEventStyle } from '@/components/agenda/agenda-calendar-config';
import { CalendarToolbar } from '@/components/agenda/CalendarToolbar';
import type { CalendarEvent } from '@/components/agenda/types';
import { dutchFormats } from '@/lib/agenda/calendarFormats';
import { findNoLessonPeriod, type NoLessonPeriod } from '@/lib/agenda/noLessonPeriod';
import { buildTooltipText } from '@/lib/agenda/tooltip';
import { calendarLocalizer } from '@/lib/calendar';

export interface GetCalendarPropsParams {
	events: CalendarEvent[];
	currentView: View;
	currentDate: Date;
	canEdit: boolean;
	isOwnAgenda: boolean;
	min: Date;
	max: Date;
	scrollToTime: Date;
	onEventDrop: ((args: { event: CalendarEvent; start: Date; end: Date }) => void) | undefined;
	onSelectEvent: ((event: CalendarEvent) => void) | undefined;
	onSelectSlot: ((slotInfo: { start: Date; end: Date }) => void) | undefined;
	setCurrentView: (view: View) => void;
	setCurrentDate: (date: Date) => void;
	noLessonPeriods?: NoLessonPeriod[];
}

export function getCalendarProps(params: GetCalendarPropsParams) {
	const {
		events,
		currentView,
		currentDate,
		canEdit,
		isOwnAgenda,
		min,
		max,
		scrollToTime,
		onEventDrop,
		onSelectEvent,
		onSelectSlot,
		setCurrentView,
		setCurrentDate,
		noLessonPeriods,
	} = params;

	const dayPropGetter = (date: Date) => {
		const period = findNoLessonPeriod(date, noLessonPeriods);
		if (!period) return {};
		return {
			className: 'rbc-day-no-lesson',
			'aria-label': period.name ? `Lesvrij: ${period.name}` : 'Lesvrije periode',
		};
	};

	return {
		localizer: calendarLocalizer,
		formats: dutchFormats,
		culture: 'nl-NL',
		events,
		showAllEvents: true,
		startAccessor: (event: unknown) => (event as CalendarEvent).start,
		endAccessor: (event: unknown) => (event as CalendarEvent).end,
		view: currentView,
		onView: setCurrentView,
		date: currentDate,
		onNavigate: setCurrentDate,
		onSelectEvent: canEdit && isOwnAgenda ? onSelectEvent : undefined,
		onSelectSlot: canEdit && isOwnAgenda ? onSelectSlot : undefined,
		selectable: canEdit && isOwnAgenda,
		onEventDrop: canEdit ? onEventDrop : undefined,
		draggableAccessor: () => canEdit,
		resizableAccessor: () => false,
		eventPropGetter: (event: unknown) => getEventStyle(event as CalendarEvent, currentView),
		tooltipAccessor: (event: unknown) => buildTooltipText(event as CalendarEvent),
		dayPropGetter,
		slotPropGetter: dayPropGetter,
		components: {
			toolbar: CalendarToolbar,
			// biome-ignore lint/suspicious/noExplicitAny: react-big-calendar event component typing
			event: AgendaEvent as unknown as React.ComponentType<any>,
		},
		min,
		max,
		scrollToTime,
		step: 30,
		timeslots: 1,
		messages: agendaMessages,
	};
}
