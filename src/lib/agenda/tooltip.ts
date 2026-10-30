import type { CalendarEvent } from '@/components/agenda/types';
import {
	buildTooltipFirstLine,
	buildTooltipNotesLines,
	buildTooltipParticipantLines,
	buildTooltipStatusLines,
} from '@/lib/agenda/tooltipHelpers';

/** Native title text; react-big-calendar already prefixes the time range in week/day views. */
export function buildTooltipText(event: CalendarEvent): string {
	const lines = [
		buildTooltipFirstLine(String(event.title), event.resource),
		...buildTooltipParticipantLines(event.resource),
		...buildTooltipNotesLines(event.resource),
		...buildTooltipStatusLines(event.resource),
	];
	return lines.join('\n');
}
