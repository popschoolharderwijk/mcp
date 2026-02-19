import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';

interface PeriodStepContentProps {
	startDate: string;
	endDate: string;
	onStartDateChange: (date: string) => void;
	onEndDateChange: (date: string) => void;
	startDatePickerRef?: React.RefObject<HTMLButtonElement>;
}

export function PeriodStepContent({
	startDate,
	endDate,
	onStartDateChange,
	onEndDateChange,
	startDatePickerRef,
}: PeriodStepContentProps) {
	return (
		<div className="space-y-4 py-4">
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor="wizard-start">Startdatum</Label>
					<DatePicker
						id="wizard-start"
						value={startDate}
						onChange={onStartDateChange}
						triggerRef={startDatePickerRef}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="wizard-end">Einddatum</Label>
					<DatePicker id="wizard-end" value={endDate} onChange={onEndDateChange} />
				</div>
			</div>
		</div>
	);
}
