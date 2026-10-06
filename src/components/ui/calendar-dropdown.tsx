'use client';

import type { ChangeEvent } from 'react';
import type { DropdownProps } from 'react-day-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
			<SelectContent className="max-h-60 min-w-[var(--radix-select-trigger-width)] [&_[data-radix-select-viewport]]:h-auto [&_[data-radix-select-viewport]]:max-h-60">
				{options?.map((option) => (
					<SelectItem key={option.value} value={String(option.value)} disabled={option.disabled}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
