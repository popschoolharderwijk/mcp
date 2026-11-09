import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { pastDatePickerRange } from '@/lib/date/datePickerHelpers';
import { cn } from '@/lib/utils';

interface DateOfBirthFieldProps {
	id: string;
	value: string | null;
	onChange: (value: string | null) => void;
	onDraftSyncedChange?: (synced: boolean) => void;
	className?: string;
	label?: string;
}

/** Date of birth: typeable dd-mm-yyyy + calendar, limited to past dates. */
export function DateOfBirthField({
	id,
	value,
	onChange,
	onDraftSyncedChange,
	className,
	label = 'Geboortedatum',
}: DateOfBirthFieldProps) {
	return (
		<div className={cn('space-y-1.5', className)}>
			<Label htmlFor={id}>{label}</Label>
			<DatePicker
				variant="input"
				id={id}
				value={value}
				onChange={onChange}
				onDraftSyncedChange={onDraftSyncedChange}
				{...pastDatePickerRange()}
				autoComplete="bday"
				calendarAriaLabel="Kies geboortedatum"
			/>
		</div>
	);
}
