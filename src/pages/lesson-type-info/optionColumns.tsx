import type { DataTableColumn } from '@/components/ui/data-table';
import { formatDateNl } from '@/lib/billing/lessonFeeFormat';
import { frequencyLabels } from '@/lib/frequencies';
import type { OptionRowWithKey } from '@/pages/lesson-type-info/types';
import { formatOptionPrice } from '@/pages/lesson-type-info/utils';

export function createLessonTypeOptionColumns(): DataTableColumn<OptionRowWithKey>[] {
	return [
		{
			key: 'duration_minutes',
			label: 'Lesvorm',
			sortable: true,
			sortValue: (opt) => parseInt(opt.duration_minutes, 10) || 0,
			className: 'min-w-0',
			render: (opt) =>
				`${opt.label ? `${opt.label} · ` : ''}${opt.duration_minutes} min, ${frequencyLabels[opt.frequency].toLowerCase()}`,
		},
		{
			key: 'billing_kind',
			label: 'Afrekening',
			className: 'w-[8rem] min-w-0',
			render: (opt) => (opt.billing_kind === 'one_off' ? 'Eenmalig' : 'Per maand'),
		},
		{
			key: 'amount_under_21',
			label: '< 21',
			sortable: true,
			sortValue: (opt) => parseFloat(opt.amount_under_21) || 0,
			className: 'w-[7rem] min-w-0',
			render: (opt) => formatOptionPrice(opt.amount_under_21),
		},
		{
			key: 'amount_adult',
			label: '21+ (incl. btw)',
			sortable: true,
			sortValue: (opt) => parseFloat(opt.amount_adult) || 0,
			className: 'w-[8rem] min-w-0',
			render: (opt) => (opt.has_adult_tariff ? formatOptionPrice(opt.amount_adult) : 'n.v.t.'),
		},
		{
			key: 'effective_from',
			label: 'Geldig vanaf',
			className: 'w-[9rem] min-w-0',
			render: (opt) => (opt.effective_from ? formatDateNl(opt.effective_from) : '—'),
		},
	];
}
