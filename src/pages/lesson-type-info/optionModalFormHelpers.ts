import type { OptionModalFormState } from '@/pages/lesson-type-info/types';

export function updateOptionModalField<K extends keyof OptionModalFormState>(
	prev: OptionModalFormState,
	key: K,
	value: OptionModalFormState[K],
): OptionModalFormState {
	const next = { ...prev, [key]: value };
	// Without 21+ tariff there is no 21+ amount.
	if (key === 'has_adult_tariff' && value === false) next.amount_adult = '';
	return next;
}
