import { DEFAULT_DURATION_MINUTES } from '@/pages/lesson-type-info/constants';
import type { LessonBillingKind, LessonTypeOptionFormRow } from '@/types/lesson-agreements';

export type OptionRowWithKey = LessonTypeOptionFormRow & { _newId?: string };

/** Editable fields of one lesson form in the modal (amounts in euros as string). */
export type OptionModalFormState = Omit<LessonTypeOptionFormRow, 'id' | 'tariffs'>;

/** Default effective date for a new tariff: next 1 September. */
export function defaultTariffEffectiveFrom(today: Date = new Date()): string {
	const year = today.getMonth() >= 8 ? today.getFullYear() + 1 : today.getFullYear();
	return `${year}-09-01`;
}

const DEFAULT_BILLING_KIND: LessonBillingKind = 'monthly';

export const emptyOptionModalForm: OptionModalFormState = {
	duration_minutes: '',
	frequency: 'weekly',
	label: '',
	billing_kind: DEFAULT_BILLING_KIND,
	has_adult_tariff: true,
	effective_from: '',
	amount_under_21: '',
	amount_adult: '',
};

export function createNewOptionRow(newId: string, today: Date = new Date()): OptionRowWithKey {
	return {
		_newId: newId,
		duration_minutes: String(DEFAULT_DURATION_MINUTES),
		frequency: 'weekly',
		label: '',
		billing_kind: DEFAULT_BILLING_KIND,
		has_adult_tariff: true,
		effective_from: defaultTariffEffectiveFrom(today),
		amount_under_21: '',
		amount_adult: '',
		tariffs: [],
	};
}
