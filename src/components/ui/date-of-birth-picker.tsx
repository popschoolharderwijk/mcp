'use client';

import { startOfDay } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { LuCalendar } from 'react-icons/lu';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DATE_FORMAT_UI, formatDateToDb, now } from '@/lib/date/date-format';
import {
	DOB_EARLIEST,
	formatDbDateOfBirthForInput,
	isDateOfBirthDraftSynced,
	parseDbDateOfBirthValue,
	parseUiDateOfBirthToDb,
} from '@/lib/date/dateOfBirthPickerHelpers';
import { cn } from '@/lib/utils';

interface DateOfBirthPickerProps {
	/** Value in YYYY-MM-dd format */
	value: string | null;
	onChange: (value: string | null) => void;
	/** Called whenever the typed draft matches (or not) the committed value. */
	onDraftSyncedChange?: (synced: boolean) => void;
	placeholder?: string;
	disabled?: boolean;
	id?: string;
	className?: string;
}

const DOB_START_MONTH = new Date(1900, 0);

/**
 * Date of birth: typeable dd-MM-yyyy input plus calendar with month/year dropdowns.
 * @see https://ui.shadcn.com/docs/components/base/date-picker
 */
export function DateOfBirthPicker({
	value,
	onChange,
	onDraftSyncedChange,
	placeholder = DATE_FORMAT_UI,
	disabled = false,
	id,
	className,
}: DateOfBirthPickerProps) {
	const today = useMemo(() => startOfDay(now()), []);
	const [open, setOpen] = useState(false);
	const [text, setText] = useState(() => formatDbDateOfBirthForInput(value));

	useEffect(() => {
		setText(formatDbDateOfBirthForInput(value));
	}, [value]);

	const selectedDate = parseDbDateOfBirthValue(value);

	const reportSynced = (nextText: string, committed: string | null) => {
		onDraftSyncedChange?.(isDateOfBirthDraftSynced(nextText, committed, today));
	};

	const applyText = (next: string) => {
		setText(next);
		const trimmed = next.trim();
		if (!trimmed) {
			onChange(null);
			reportSynced('', null);
			return;
		}
		const db = parseUiDateOfBirthToDb(next, today);
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
		const db = parseUiDateOfBirthToDb(text, today);
		if (db) {
			onChange(db);
			const formatted = formatDbDateOfBirthForInput(db);
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
		const formatted = formatDbDateOfBirthForInput(db);
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
				autoComplete="bday"
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
						aria-label="Kies geboortedatum"
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
						startMonth={DOB_START_MONTH}
						endMonth={today}
						disabled={{ before: DOB_EARLIEST, after: today }}
					/>
				</PopoverContent>
			</Popover>
		</div>
	);
}
