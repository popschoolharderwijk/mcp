import { format, getDay, startOfWeek } from 'date-fns';
import { nl } from 'date-fns/locale';
import { dateFnsLocalizer } from 'react-big-calendar';

export const calendarLocalizer = dateFnsLocalizer({
	format,
	parse: (value: string) => new Date(value), // placeholder - not used by react-big-calendar
	startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1, locale: nl }),
	getDay,
	locales: {
		'nl-NL': nl,
	},
});
