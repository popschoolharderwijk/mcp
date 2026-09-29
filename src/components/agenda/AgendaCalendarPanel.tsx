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
}

export function AgendaCalendarPanel({ calendarProps, currentView }: AgendaCalendarPanelProps) {
	const dndProps = calendarProps as unknown as ComponentProps<typeof DragAndDropCalendar>;
	return (
		<>
			{/* No ScrollArea: Radix viewport uses display:table and collapses RBC agenda-view height. */}
			<div className="popschool-calendar rounded-lg border border-border bg-card overflow-hidden flex-1 flex flex-col min-h-0">
				<CalendarViewProvider value={currentView}>
					<DragAndDropCalendar {...dndProps} />
				</CalendarViewProvider>
			</div>
			<Legend show={currentView !== 'agenda'} />
		</>
	);
}
