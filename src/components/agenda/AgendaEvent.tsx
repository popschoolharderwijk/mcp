import {
	buildAgendaEventTypeFlags,
	getAgendaEventDisplayTitle,
	getAgendaEventIconColorClass,
	getEventDurationMinutes,
	getLineClampClassForDuration,
	resolveAgendaEventIconType,
} from '@/lib/agenda/agendaEventDisplay';
import type { AgendaEventProps } from './AgendaEvent.types';
import { AgendaEventOverlayIcons } from './AgendaEventOverlayIcons';
import { AgendaEventTypeIcon } from './AgendaEventTypeIcon';
import { useCalendarView } from './CalendarViewContext';

export function AgendaEvent({ event, title }: AgendaEventProps) {
	const view = useCalendarView();
	const { hasTimeOrDateChange, isCancelled, isRecurring, color, lessonTypeColor, cancellationType } = event.resource;

	const typeFlags = buildAgendaEventTypeFlags(event.resource);
	const iconType = resolveAgendaEventIconType(typeFlags);
	const isTeacherCancelled = isCancelled && cancellationType === 'teacher';
	const displayTitle = getAgendaEventDisplayTitle(view ?? 'week', event.start, title);
	const iconColorClass = getAgendaEventIconColorClass(color, lessonTypeColor, event.resource, view ?? undefined);
	const durationMinutes = getEventDurationMinutes(event.start, event.end);
	const lineClampClass = getLineClampClassForDuration(durationMinutes);
	const isAgendaList = view === 'agenda';

	return (
		<div className={`h-full w-full overflow-hidden${isAgendaList ? ' relative' : ''}`}>
			<AgendaEventOverlayIcons
				isRecurring={Boolean(isRecurring)}
				isCancelled={isCancelled}
				isTeacherCancelled={isTeacherCancelled}
				hasTimeOrDateChange={Boolean(hasTimeOrDateChange)}
				iconColorClass={iconColorClass}
			/>
			<span
				className={`flex items-start gap-1 leading-tight overflow-hidden pr-4 min-h-0 ${isAgendaList ? 'text-sm' : 'text-xs'}`}
			>
				<AgendaEventTypeIcon iconType={iconType} iconColorClass={iconColorClass} />
				<span className={`min-w-0 flex-1 ${lineClampClass} break-words`}>{displayTitle}</span>
			</span>
		</div>
	);
}
