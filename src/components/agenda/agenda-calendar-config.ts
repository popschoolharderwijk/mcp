import type { View } from 'react-big-calendar';
import { agendaDefaultStyleVars, resolveAgendaDefaultKind } from '@/lib/agenda/agenda-default-style-vars';
import { darkenColor, getContrastTextColor } from '@/lib/color/color-utils';
import type { CalendarEvent } from './types';

export const agendaMessages = {
	next: 'Volgende',
	previous: 'Vorige',
	today: 'Vandaag',
	month: 'Maand',
	week: 'Week',
	day: 'Dag',
	agenda: 'Agenda',
	date: 'Datum',
	time: 'Tijd',
	event: 'Afspraak',
	noEventsInRange: 'Geen afspraken in dit bereik',
	showMore: (total: number) => `+${total} meer`,
};

export function getEventStyle(event: CalendarEvent, currentView: View) {
	if (currentView === 'agenda') {
		return { style: { backgroundColor: 'transparent', border: 'none', color: 'inherit', opacity: 1 } };
	}
	const isCancelled = event.resource.isCancelled;
	const isPending = event.resource.isPending;
	const customColor = event.resource.color || event.resource.lessonTypeColor;
	const defaultKind = resolveAgendaDefaultKind(event.resource);

	let backgroundColor: string;
	let borderColor: string;
	let color: string;

	if (customColor) {
		backgroundColor = customColor;
		borderColor = darkenColor(customColor, 0.25);
		color = getContrastTextColor(backgroundColor);
	} else {
		const kind = defaultKind ?? 'lesson';
		const defaults = agendaDefaultStyleVars(kind);
		backgroundColor = defaults.backgroundColor;
		borderColor = defaults.borderColor;
		color = defaults.color;
	}

	let opacity = 0.9;
	if (isCancelled) opacity = 0.45;
	else if (isPending) opacity = 0.5;

	return {
		style: {
			backgroundColor,
			borderColor,
			borderLeftWidth: '4px',
			borderStyle: isPending ? 'dashed' : 'solid',
			color,
			borderRadius: '4px',
			opacity,
		},
	};
}
