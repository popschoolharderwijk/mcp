'use client';

import * as React from 'react';
import { LuChevronDown } from 'react-icons/lu';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DATE_INPUT_PLACEHOLDER, formatDbDateToUi } from '@/lib/date/date-format';
import { cn } from '@/lib/utils';

interface DatePickerProps {
	/** Value in YYYY-MM-dd format */
	value: string | null;
	onChange: (value: string | null) => void;
	placeholder?: string;
	disabled?: boolean;
	id?: string;
	className?: string;
	/** Ref for the trigger (e.g. for autofocus) */
	triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

/**
 * Date picker with trigger button and calendar popover (shadcn-style).
 * Value is always YYYY-MM-dd; display uses Dutch dd-MM-yyyy.
 */
export function DatePicker({
	value,
	onChange,
	placeholder = DATE_INPUT_PLACEHOLDER,
	disabled = false,
	id,
	className,
	triggerRef,
}: DatePickerProps) {
	const [open, setOpen] = React.useState(false);

	const selectedDate = value ? new Date(value + (value.length === 10 ? 'T12:00:00' : '')) : undefined;

	const handleSelect = (date: Date | undefined) => {
		if (!date) {
			onChange(null);
			return;
		}
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		onChange(`${year}-${month}-${day}`);
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					ref={triggerRef}
					id={id}
					variant="outline"
					disabled={disabled}
					data-empty={!value}
					className={cn(
						'w-full justify-between text-left font-normal data-[empty=true]:text-muted-foreground',
						className,
					)}
				>
					{value ? formatDbDateToUi(value) : <span>{placeholder}</span>}
					<LuChevronDown data-icon="inline-end" className="h-4 w-4 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar mode="single" selected={selectedDate} onSelect={handleSelect} defaultMonth={selectedDate} />
			</PopoverContent>
		</Popover>
	);
}
