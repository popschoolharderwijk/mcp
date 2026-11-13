import { formatLessonOptionSummary } from '@/lib/frequencies';
import type { LessonFrequency } from '@/types/lesson-agreements';

export interface OptionSnapshot {
	duration_minutes: number;
	frequency: LessonFrequency;
	price_per_lesson: number;
}

type SelectOption = OptionSnapshot & { id: string };

interface Props {
	options: SelectOption[];
	value: OptionSnapshot | null;
	onChange: (snap: OptionSnapshot | null) => void;
	placeholder?: string;
	id?: string;
}

function findOptionId(options: SelectOption[], snap: OptionSnapshot | null): string {
	if (!snap) return '';
	return (
		options.find(
			(o) =>
				o.duration_minutes === snap.duration_minutes &&
				o.frequency === snap.frequency &&
				o.price_per_lesson === snap.price_per_lesson,
		)?.id ?? ''
	);
}

export function LessonTypeOptionSelect({ options, value, onChange, placeholder = 'Selecteer optie...', id }: Props) {
	return (
		<select
			id={id}
			className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
			value={findOptionId(options, value)}
			onChange={(e) => {
				const next = e.target.value;
				if (!next) {
					onChange(null);
					return;
				}
				const opt = options.find((o) => o.id === next);
				if (opt) {
					onChange({
						duration_minutes: opt.duration_minutes,
						frequency: opt.frequency,
						price_per_lesson: opt.price_per_lesson,
					});
				}
			}}
		>
			<option value="">{placeholder}</option>
			{options.map((opt) => (
				<option key={opt.id} value={opt.id}>
					{formatLessonOptionSummary(opt)}
				</option>
			))}
		</select>
	);
}
