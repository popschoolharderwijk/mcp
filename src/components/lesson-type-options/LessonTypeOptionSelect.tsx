import { frequencyLabels } from '@/lib/frequencies';
import type { LessonFrequency } from '@/types/lesson-agreements';

/** Selected lesson form. Fees come from the tariff list, not from this snapshot. */
export interface OptionSnapshot {
	id: string;
	duration_minutes: number;
	frequency: LessonFrequency;
	label?: string | null;
}

interface Props {
	options: OptionSnapshot[];
	value: OptionSnapshot | null;
	onChange: (snap: OptionSnapshot | null) => void;
	placeholder?: string;
	id?: string;
}

export function formatLessonFormLabel(opt: Pick<OptionSnapshot, 'duration_minutes' | 'frequency' | 'label'>): string {
	const base = `${opt.duration_minutes} min · ${frequencyLabels[opt.frequency]}`;
	return opt.label ? `${opt.label} · ${base}` : base;
}

export function LessonTypeOptionSelect({ options, value, onChange, placeholder = 'Selecteer lesvorm...', id }: Props) {
	return (
		<select
			id={id}
			className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
			value={value?.id ?? ''}
			onChange={(e) => {
				const opt = options.find((o) => o.id === e.target.value);
				onChange(
					opt
						? {
								id: opt.id,
								duration_minutes: opt.duration_minutes,
								frequency: opt.frequency,
								label: opt.label,
							}
						: null,
				);
			}}
		>
			<option value="">{placeholder}</option>
			{options.map((opt) => (
				<option key={opt.id} value={opt.id}>
					{formatLessonFormLabel(opt)}
				</option>
			))}
		</select>
	);
}
