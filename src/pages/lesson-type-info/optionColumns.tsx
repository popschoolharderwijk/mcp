import type { DataTableColumn } from '@/components/ui/data-table';
import { frequencyLabels } from '@/lib/frequencies';
import type { OptionRowWithKey } from '@/pages/lesson-type-info/types';
import { formatOptionPrice } from '@/pages/lesson-type-info/utils';

export function createLessonTypeOptionColumns(): DataTableColumn<OptionRowWithKey>[] {
	return [
		{
			key: 'duration_minutes',
			label: 'Duur (min)',
			sortable: true,
			sortValue: (opt) => parseInt(opt.duration_minutes, 10) || 0,
			className: 'w-[7.5rem] min-w-0 overflow-hidden',
			render: (opt) => `${opt.duration_minutes} min`,
		},
		{
			key: 'frequency',
			label: 'Frequentie',
			sortable: true,
			sortValue: (opt) => ['weekly', 'biweekly', 'monthly', 'daily'].indexOf(opt.frequency),
			className: 'w-[9rem] min-w-0 overflow-hidden',
			render: (opt) => frequencyLabels[opt.frequency],
		},
		{
			key: 'price_per_lesson_youth',
			label: 'Prijs jongeren (€)',
			sortable: true,
			sortValue: (opt) => parseFloat(opt.price_per_lesson_youth) || 0,
			className: 'w-[8rem] min-w-0',
			render: (opt) => formatOptionPrice(opt.price_per_lesson_youth),
		},
		{
			key: 'price_per_lesson_adult',
			label: 'Prijs volwassenen (€)',
			sortable: true,
			sortValue: (opt) => parseFloat(opt.price_per_lesson_adult) || 0,
			className: 'w-[8rem] min-w-0',
			render: (opt) => formatOptionPrice(opt.price_per_lesson_adult),
		},
	];
}
