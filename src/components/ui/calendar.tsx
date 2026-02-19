'use client';

import { isBefore, startOfDay } from 'date-fns';
import { DayPicker, getDefaultClassNames } from 'react-day-picker';
import { nl } from 'react-day-picker/locale';
import { cn } from '@/lib/utils';

import 'react-day-picker/style.css';
import './calendar.css';

/** Matcher: dates before today (start of day) */
function isPastDate(date: Date) {
	return isBefore(date, startOfDay(new Date()));
}

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

const defaultClassNames = getDefaultClassNames();

/** Extend default class names with Tailwind; nav/caption layout from style.css + calendar-overrides.css */
const calendarClassNames = {
	...defaultClassNames,
	root: cn(defaultClassNames.root, 'p-2'),
	day_button: cn(defaultClassNames.day_button, 'rounded', 'hover:bg-primary hover:text-primary-foreground'),
};

/** Modifier: past days get a muted look */
const pastModifiers = { past: isPastDate };
const pastModifiersClassNames = {
	past: 'text-muted-foreground',
};

/**
 * Calendar component (shadcn-style) using react-day-picker.
 * Dutch locale, Monday as first day of week. Pure Tailwind via classNames slots.
 */
function Calendar({
	className,
	classNames,
	showOutsideDays = true,
	modifiers: propsModifiers,
	modifiersClassNames: propsModifiersClassNames,
	...props
}: CalendarProps) {
	return (
		<DayPicker
			locale={nl}
			weekStartsOn={1}
			navLayout="around"
			className={cn('rdp-root', calendarClassNames.root, className)}
			classNames={{
				...calendarClassNames,
				...classNames,
			}}
			showWeekNumber
			showOutsideDays={showOutsideDays}
			modifiers={{ ...pastModifiers, ...propsModifiers }}
			modifiersClassNames={{ ...pastModifiersClassNames, ...propsModifiersClassNames }}
			{...props}
		/>
	);
}
Calendar.displayName = 'Calendar';

export { Calendar };
