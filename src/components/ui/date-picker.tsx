'use client';

import { startOfDay } from 'date-fns';
import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { LuCalendar, LuChevronDown } from 'react-icons/lu';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DATE_FORMAT_UI_PLACEHOLDER, formatDateToDb, formatDbDateToUi, now } from '@/lib/date/date-format';
import {
	formatDbDateForInput,
	isDatePickerDraftSynced,
	parseDbDateValue,
	parseUiDateToDb,
} from '@/lib/date/datePickerHelpers';
import { cn } from '@/lib/utils';

type DatePickerVariant = 'button' | 'input';

interface DatePickerProps {
	/** Value in YYYY-MM-dd format */
	value: string | null;
	onChange: (value: string | null) => void;
	/** `button` = outline trigger (default). `input` = typeable dd-mm-jjjj + calendar. */
	variant?: DatePickerVariant;
	/** Inclusive lower bound for selectable dates (input calendar + typed parse). */
	minDate?: Date;
	/** Inclusive upper bound for selectable dates (input calendar + typed parse). */
	maxDate?: Date;
	/** Called whenever the typed draft matches (or not) the committed value (input variant). */
	onDraftSyncedChange?: (synced: boolean) => void;
	placeholder?: string;
	disabled?: boolean;
	id?: string;
	className?: string;
	/** Calendar button aria-label (input variant). */
	calendarAriaLabel?: string;
	autoComplete?: string;
	/** Ref for the trigger (button variant, e.g. autofocus). */
	triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

function ButtonDatePicker({
	value,
	onChange,
	placeholder = DATE_FORMAT_UI_PLACEHOLDER,
	disabled = false,
	id,
	className,
	triggerRef,
}: DatePickerProps) {
	const [open, setOpen] = React.useState(false);
	const selectedDate = parseDbDateValue(value);

	const handleSelect = (date: Date | undefined) => {
		if (!date) {
			onChange(null);
			return;
		}
		onChange(formatDateToDb(date));
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					ref={triggerRef as React.Ref<HTMLButtonElement> | undefined}
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

function InputDatePicker({
	value,
	onChange,
	onDraftSyncedChange,
	placeholder = DATE_FORMAT_UI_PLACEHOLDER,
	disabled = false,
	id,
	className,
	minDate,
	maxDate,
	calendarAriaLabel = 'Kies datum',
	autoComplete,
}: DatePickerProps) {
	const today = useMemo(() => startOfDay(now()), []);
	const range = useMemo(() => ({ minDate, maxDate }), [minDate, maxDate]);
	const [open, setOpen] = useState(false);
	const [text, setText] = useState(() => formatDbDateForInput(value));

	useEffect(() => {
		setText(formatDbDateForInput(value));
	}, [value]);

	const selectedDate = parseDbDateValue(value);
	const startMonth = minDate ?? new Date(1900, 0);
	const endMonth = maxDate ?? today;

	const reportSynced = (nextText: string, committed: string | null) => {
		onDraftSyncedChange?.(isDatePickerDraftSynced(nextText, committed, range, today));
	};

	const applyText = (next: string) => {
		setText(next);
		const trimmed = next.trim();
		if (!trimmed) {
			onChange(null);
			reportSynced('', null);
			return;
		}
		const db = parseUiDateToDb(next, range, today);
		if (db) {
			onChange(db);
			reportSynced(next, db);
			return;
		}
		reportSynced(next, value);
	};

	const handleBlur = () => {
		const trimmed = text.trim();
		if (!trimmed) {
			onChange(null);
			setText('');
			reportSynced('', null);
			return;
		}
		const db = parseUiDateToDb(text, range, today);
		if (db) {
			onChange(db);
			const formatted = formatDbDateForInput(db);
			setText(formatted);
			reportSynced(formatted, db);
			return;
		}
		reportSynced(text, value);
	};

	const handleSelect = (date: Date | undefined) => {
		if (!date) {
			onChange(null);
			setText('');
			reportSynced('', null);
			return;
		}
		const db = formatDateToDb(date);
		const formatted = formatDbDateForInput(db);
		onChange(db);
		setText(formatted);
		reportSynced(formatted, db);
		setOpen(false);
	};

	return (
		<div className={cn('relative', className)}>
			<Input
				id={id}
				value={text}
				disabled={disabled}
				placeholder={placeholder}
				inputMode="numeric"
				autoComplete={autoComplete}
				className="pr-10"
				onChange={(event) => applyText(event.target.value)}
				onBlur={handleBlur}
			/>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						disabled={disabled}
						className="absolute right-0 top-0 h-10 w-10 text-muted-foreground"
						aria-label={calendarAriaLabel}
					>
						<LuCalendar className="h-4 w-4" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="end">
					<Calendar
						mode="single"
						selected={selectedDate}
						onSelect={handleSelect}
						defaultMonth={selectedDate}
						captionLayout="dropdown"
						startMonth={startMonth}
						endMonth={endMonth}
						disabled={buildInputCalendarDisabled(minDate, maxDate)}
					/>
				</PopoverContent>
			</Popover>
		</div>
	);
}

function buildInputCalendarDisabled(minDate?: Date, maxDate?: Date) {
	if (minDate && maxDate) return { before: minDate, after: maxDate };
	if (minDate) return { before: minDate };
	if (maxDate) return { after: maxDate };
	return undefined;
}

/**
 * Date picker: button trigger (default) or typeable dd-mm-jjjj input + calendar.
 * Value is always YYYY-MM-dd; display uses Dutch dd-MM-yyyy (date-fns tokens).
 */
export function DatePicker(props: DatePickerProps) {
	if (props.variant === 'input') {
		return <InputDatePicker {...props} />;
	}
	return <ButtonDatePicker {...props} />;
}
