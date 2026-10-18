import type { ComponentProps } from 'react';
import type { View } from 'react-big-calendar';
import { Calendar } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { CalendarViewProvider } from '@/components/agenda/CalendarViewContext';
import { Legend } from '@/components/agenda/Legend';
import type { getCalendarProps } from '@/lib/agenda/calendarProps';

const DragAndDropCalendar = withDragAndDrop(Calendar);

interface AgendaCalendarPanelProps {
	calendarProps: ReturnType<typeof getCalendarProps>;
	currentView: View;
	currentDate: Date;
}

export function AgendaCalendarPanel({ calendarProps, currentView, currentDate }: AgendaCalendarPanelProps) {
	const dndProps = calendarProps as unknown as ComponentProps<typeof DragAndDropCalendar>;
	return (
		<>
			{/* Same pattern as TeacherAvailabilityGrid: un-nested @container (nesting under .popschool-calendar breaks it). */}
			<style>{`
				.popschool-calendar .rbc-time-view .rbc-event {
					container-type: size;
					container-name: agenda-event;
				}
				.popschool-calendar .rbc-time-view .agenda-event-title {
					display: -webkit-box;
					-webkit-box-orient: vertical;
					overflow: hidden;
					overflow-wrap: anywhere;
					-webkit-line-clamp: 1;
				}
				@container agenda-event (max-height: 1.5rem) {
					.popschool-calendar .rbc-time-view .rbc-event-label {
						display: none;
					}
				}
				@container agenda-event (min-height: 2.25rem) {
					.popschool-calendar .rbc-time-view .agenda-event-title {
						-webkit-line-clamp: 2;
					}
				}
				@container agenda-event (min-height: 3rem) {
					.popschool-calendar .rbc-time-view .agenda-event-title {
						-webkit-line-clamp: 3;
					}
				}
				@container agenda-event (min-height: 3.75rem) {
					.popschool-calendar .rbc-time-view .agenda-event-title {
						-webkit-line-clamp: 4;
					}
				}
			`}</style>
			{/* No ScrollArea: Radix viewport uses display:table and collapses RBC agenda-view height. */}
			<div className="popschool-calendar rounded-lg border border-border bg-card overflow-hidden flex-1 flex flex-col min-h-0">
				<CalendarViewProvider value={currentView}>
					{/* Remount on date/view so RBC TimeGrid re-applies scrollToTime (mount-only). */}
					<DragAndDropCalendar key={`${currentView}-${currentDate.getTime()}`} {...dndProps} />
				</CalendarViewProvider>
			</div>
			<Legend show={currentView !== 'agenda'} />
		</>
	);
}
