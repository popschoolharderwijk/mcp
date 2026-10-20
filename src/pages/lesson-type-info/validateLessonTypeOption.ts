import type { OptionModalFormState } from '@/pages/lesson-type-info/types';
import { inputToCentsOrNull } from '@/pages/lesson-type-info/utils';

type OptionTariffFields = Pick<
	OptionModalFormState,
	'duration_minutes' | 'effective_from' | 'amount_under_21' | 'amount_adult' | 'has_adult_tariff'
>;

function getTariffFieldsError(form: OptionTariffFields): string | null {
	const durationMinutes = parseInt(form.duration_minutes, 10);
	if (Number.isNaN(durationMinutes) || durationMinutes <= 0) {
		return 'duur moet een positief getal zijn';
	}
	if (!/^\d{4}-\d{2}-\d{2}$/.test(form.effective_from)) {
		return 'kies een ingangsdatum voor het tarief';
	}
	const under = inputToCentsOrNull(form.amount_under_21);
	const adult = form.has_adult_tariff ? inputToCentsOrNull(form.amount_adult) : null;
	if (under === null && adult === null) {
		return form.has_adult_tariff ? 'vul een bedrag onder 21 of een 21+-bedrag in' : 'vul een bedrag onder 21 in';
	}
	return null;
}

function capitalize(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1);
}

export function getOptionModalValidationError(form: OptionModalFormState): string | null {
	const error = getTariffFieldsError(form);
	return error ? capitalize(error) : null;
}

export function getOptionRowValidationError(option: OptionTariffFields, index: number): string | null {
	const error = getTariffFieldsError(option);
	return error ? `Optie ${index + 1}: ${error}` : null;
}
