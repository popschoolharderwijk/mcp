import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';

interface PeriodPresetControlsProps<T extends string> {
	preset: T;
	presets: readonly T[];
	labels: Record<T, string>;
	onPresetChange: (preset: T) => void;
	startDate: string;
	endDate: string;
	onStartDateChange: (value: string) => void;
	onEndDateChange: (value: string) => void;
	customPreset?: T;
	/** Optional control aligned to the right of the preset row (e.g. settings icon). */
	trailing?: React.ReactNode;
}

export function PeriodPresetControls<T extends string>({
	preset,
	presets,
	labels,
	onPresetChange,
	startDate,
	endDate,
	onStartDateChange,
	onEndDateChange,
	customPreset = 'custom' as T,
	trailing,
}: PeriodPresetControlsProps<T>) {
	return (
		<>
			<div className="flex flex-wrap items-start gap-2">
				<div className="flex min-w-0 flex-1 flex-wrap gap-2">
					{presets.map((p) => (
						<Button
							key={p}
							variant={preset === p ? 'default' : 'outline'}
							size="sm"
							onClick={() => onPresetChange(p)}
						>
							{labels[p]}
						</Button>
					))}
				</div>
				{trailing}
			</div>

			{preset === customPreset && (
				<div className="flex flex-wrap items-end gap-4">
					<div className="space-y-1.5">
						<Label>Startdatum</Label>
						<DatePicker value={startDate} onChange={(v) => onStartDateChange(v || '')} />
					</div>
					<div className="space-y-1.5">
						<Label>Einddatum</Label>
						<DatePicker value={endDate} onChange={(v) => onEndDateChange(v || '')} />
					</div>
				</div>
			)}
		</>
	);
}
