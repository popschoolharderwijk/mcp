import type { ToolbarProps, View } from 'react-big-calendar';
import { LuChevronLeft, LuChevronRight, LuMaximize2, LuMinimize2 } from 'react-icons/lu';
import { useAgendaFullscreen } from '@/components/agenda/AgendaFullscreenContext';
import { DatePicker } from '@/components/ui/date-picker';
import { resolveCalendarViewLabel } from '@/lib/agenda/calendarToolbarHelpers';
import {
	CALENDAR_NAVIGATE,
	resolveCalendarNavAriaLabel,
	resolveCalendarNavShortcutLabel,
	resolveCalendarTodayLabel,
} from '@/lib/agenda/calendarToolbarNavigationHelpers';
import { formatDateToDb } from '@/lib/date/date-format';
import { parseDbDateValue } from '@/lib/date/datePickerHelpers';

interface CalendarToolbarNavigationProps {
	label: string;
	date: Date;
	messages: ToolbarProps['localizer']['messages'];
	onNavigate: ToolbarProps['onNavigate'];
}

export function CalendarToolbarNavigation({ label, date, messages, onNavigate }: CalendarToolbarNavigationProps) {
	const todayLabel = resolveCalendarTodayLabel(messages?.today);
	const todayShortcutLabel = resolveCalendarNavShortcutLabel(todayLabel, 'TODAY');
	const previousLabel = resolveCalendarNavShortcutLabel(
		resolveCalendarNavAriaLabel(messages?.previous, 'Vorige'),
		'PREV',
	);
	const nextLabel = resolveCalendarNavShortcutLabel(resolveCalendarNavAriaLabel(messages?.next, 'Volgende'), 'NEXT');

	return (
		<span className="rbc-btn-group rbc-nav-group">
			<span className="inline-flex items-center gap-1" data-tip-target="agenda-nav">
				<button
					type="button"
					onClick={() => onNavigate(CALENDAR_NAVIGATE.TODAY)}
					aria-label={todayShortcutLabel}
					title={todayShortcutLabel}
				>
					{todayLabel}
				</button>
				<button
					type="button"
					className="rbc-nav-prev"
					onClick={() => onNavigate(CALENDAR_NAVIGATE.PREVIOUS)}
					aria-label={previousLabel}
					title={previousLabel}
				>
					<LuChevronLeft className="h-5 w-5" />
				</button>
				<button
					type="button"
					className="rbc-nav-next"
					onClick={() => onNavigate(CALENDAR_NAVIGATE.NEXT)}
					aria-label={nextLabel}
					title={nextLabel}
				>
					<LuChevronRight className="h-5 w-5" />
				</button>
			</span>
			<DatePicker
				value={formatDateToDb(date)}
				onChange={(next) => {
					const selected = parseDbDateValue(next);
					if (selected) onNavigate(CALENDAR_NAVIGATE.DATE, selected);
				}}
				captionLayout="dropdown"
				trigger={
					<button
						type="button"
						className="rbc-toolbar-label"
						aria-label="Ga naar datum"
						title="Ga naar datum"
						data-tip-target="agenda-date-picker"
					>
						{label}
					</button>
				}
			/>
		</span>
	);
}

interface CalendarToolbarViewSelectProps {
	view: View;
	viewOptions: View[];
	messages: ToolbarProps['localizer']['messages'];
	onView: ToolbarProps['onView'];
}

export function CalendarToolbarViewSelect({ view, viewOptions, messages, onView }: CalendarToolbarViewSelectProps) {
	const fullscreen = useAgendaFullscreen();
	const showViewSelect = viewOptions.length > 1;
	if (!showViewSelect && !fullscreen) return null;

	const fullscreenLabel = fullscreen?.isFullscreen ? 'Agenda verkleinen (F)' : 'Agenda vergroten (F)';

	return (
		<span className="rbc-btn-group flex items-center gap-1">
			{showViewSelect && (
				<select
					value={view}
					onChange={(event) => onView(event.target.value as View)}
					className="h-8 min-w-[5rem] cursor-pointer rounded border border-input bg-background pl-2 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
					aria-label="Weergave"
				>
					{viewOptions.map((viewOption) => (
						<option key={viewOption} value={viewOption}>
							{resolveCalendarViewLabel(viewOption, messages)}
						</option>
					))}
				</select>
			)}
			{fullscreen && (
				<button
					type="button"
					onClick={fullscreen.toggleFullscreen}
					aria-label={fullscreenLabel}
					title={fullscreenLabel}
					className="rbc-toolbar-fullscreen"
					data-tip-target="agenda-fullscreen"
				>
					{fullscreen.isFullscreen ? (
						<LuMinimize2 className="h-4 w-4" />
					) : (
						<LuMaximize2 className="h-4 w-4" />
					)}
				</button>
			)}
		</span>
	);
}
