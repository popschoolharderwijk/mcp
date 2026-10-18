'use client';

import type { ChangeEvent } from 'react';
import type { DropdownProps } from 'react-day-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

/** Instant open: avoid slide/zoom fighting Radix select repositioning. */
const calendarSelectContentClassName = cn(
	'max-h-60 min-w-[var(--radix-select-trigger-width)]',
	'[&_[data-radix-select-viewport]]:h-auto [&_[data-radix-select-viewport]]:max-h-60',
	'data-[state=open]:animate-none data-[state=closed]:animate-none',
	'data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100',
	'data-[side=bottom]:translate-y-0 data-[side=top]:translate-y-0 data-[side=left]:translate-x-0 data-[side=right]:translate-x-0',
	'data-[side=bottom]:slide-in-from-top-0 data-[side=top]:slide-in-from-bottom-0 data-[side=left]:slide-in-from-right-0 data-[side=right]:slide-in-from-left-0',
);

/** DayPicker month/year dropdown via app Select so dark mode stays readable. */
export function CalendarDropdown({ value, onChange, options, disabled }: DropdownProps) {
	const handleValueChange = (next: string) => {
		if (!onChange) return;
		const event = {
			target: { value: next },
		} as ChangeEvent<HTMLSelectElement>;
		onChange(event);
	};

	return (
		<Select value={value?.toString()} onValueChange={handleValueChange} disabled={disabled}>
			<SelectTrigger className="h-8 w-auto gap-1 px-2 text-xs font-medium">
				<SelectValue />
			</SelectTrigger>
			<SelectContent className={calendarSelectContentClassName}>
				{options?.map((option) => (
					<SelectItem key={option.value} value={String(option.value)} disabled={option.disabled}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
