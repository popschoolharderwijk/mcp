import type { ToolbarProps } from 'react-big-calendar';
import { CalendarToolbarNavigation, CalendarToolbarViewSelect } from '@/components/agenda/CalendarToolbarParts';
import { resolveCalendarViewOptions } from '@/lib/agenda/calendarToolbarHelpers';

/** Custom toolbar: same layout and classes as default, but view selector is a dropdown. */
export function CalendarToolbar({ label, date, view, views, onNavigate, onView, localizer }: ToolbarProps) {
	const messages = localizer.messages ?? {};
	const viewOptions = resolveCalendarViewOptions(views);

	return (
		<div className="rbc-toolbar">
			<CalendarToolbarNavigation label={label} date={date} messages={messages} onNavigate={onNavigate} />
			<CalendarToolbarViewSelect view={view} viewOptions={viewOptions} messages={messages} onView={onView} />
		</div>
	);
}
