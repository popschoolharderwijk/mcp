import { type ComponentProps, useEffect } from 'react';
import type { View } from 'react-big-calendar';
import { Calendar } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { AgendaFullscreenProvider } from '@/components/agenda/AgendaFullscreenContext';
import { CalendarViewProvider } from '@/components/agenda/CalendarViewContext';
import { Legend } from '@/components/agenda/Legend';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { resolveAgendaNavigateFromKeyboard, shouldToggleAgendaFullscreen } from '@/lib/agenda/agendaFullscreenKeyboard';
import type { getCalendarProps } from '@/lib/agenda/calendarProps';
import { resolveAgendaStepDate } from '@/lib/agenda/calendarToolbarNavigationHelpers';
import { cn } from '@/lib/utils';

const DragAndDropCalendar = withDragAndDrop(Calendar);

const AGENDA_EVENT_LAYOUT_STYLE = `
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
`;

interface AgendaCalendarPanelProps {
	calendarProps: ReturnType<typeof getCalendarProps>;
	currentView: View;
	currentDate: Date;
	isFullscreen: boolean;
	onFullscreenChange: (fullscreen: boolean) => void;
}

export function AgendaCalendarPanel({
	calendarProps,
	currentView,
	currentDate,
	isFullscreen,
	onFullscreenChange,
}: AgendaCalendarPanelProps) {
	const dndProps = calendarProps as unknown as ComponentProps<typeof DragAndDropCalendar>;

	const onNavigateDate = calendarProps.onNavigate;

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (shouldToggleAgendaFullscreen(event)) {
				event.preventDefault();
				onFullscreenChange(!isFullscreen);
				return;
			}
			const action = resolveAgendaNavigateFromKeyboard(event);
			if (!action) return;
			event.preventDefault();
			onNavigateDate(action === 'TODAY' ? new Date() : resolveAgendaStepDate(currentDate, currentView, action));
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [onNavigateDate, currentDate, currentView, isFullscreen, onFullscreenChange]);

	// Remount when view or time-grid scroll window changes (RBC applies scrollToTime on mount only).
	// Do not key on currentDate — full remount each week makes the day header jump one frame.
	const calendarMountKey = `${currentView}-${calendarProps.min.getTime()}-${calendarProps.scrollToTime.getTime()}`;

	const calendar = (
		<CalendarViewProvider value={currentView}>
			<DragAndDropCalendar key={calendarMountKey} {...dndProps} />
		</CalendarViewProvider>
	);

	const panelBody = (
		<>
			{/* No ScrollArea: Radix viewport uses display:table and collapses RBC agenda-view height. */}
			<div
				className={cn(
					'popschool-calendar overflow-hidden flex-1 flex flex-col min-h-0',
					isFullscreen ? 'rounded-none border-0 bg-background' : 'rounded-lg border border-border bg-card',
				)}
			>
				{calendar}
			</div>
			<Legend show={currentView !== 'agenda'} />
		</>
	);

	return (
		<AgendaFullscreenProvider
			value={{
				isFullscreen,
				toggleFullscreen: () => onFullscreenChange(!isFullscreen),
			}}
		>
			<div className="flex flex-col gap-4 flex-1 min-h-0">
				<style>{AGENDA_EVENT_LAYOUT_STYLE}</style>
				{!isFullscreen && panelBody}
				<Dialog open={isFullscreen} onOpenChange={onFullscreenChange}>
					<DialogContent
						hideCloseButton
						className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col gap-4 rounded-none border-0 p-4 sm:rounded-none"
					>
						<DialogTitle className="sr-only">Agenda volledig scherm</DialogTitle>
						{isFullscreen && panelBody}
					</DialogContent>
				</Dialog>
			</div>
		</AgendaFullscreenProvider>
	);
}
