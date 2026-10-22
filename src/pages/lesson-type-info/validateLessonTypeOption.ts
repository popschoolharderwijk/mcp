import type { OptionModalFormState } from '@/pages/lesson-type-info/types';

export interface ParsedOptionModalValues {
	durationMinutes: number;
	priceYouth: number;
	priceAdult: number;
}

export function getOptionModalValidationError(form: OptionModalFormState): string | null {
	const durationMinutes = parseInt(form.duration_minutes, 10);
	const priceYouth = parseFloat(form.price_per_lesson_youth);
	const priceAdult = parseFloat(form.price_per_lesson_adult);

	if (Number.isNaN(durationMinutes) || durationMinutes <= 0) {
		return 'Duur moet een positief getal zijn';
	}
	if (Number.isNaN(priceYouth) || priceYouth <= 0) {
		return 'Prijs jongeren moet een positief getal zijn';
	}
	if (Number.isNaN(priceAdult) || priceAdult <= 0) {
		return 'Prijs volwassenen moet een positief getal zijn';
	}

	return null;
}

export function parseOptionModalValues(form: OptionModalFormState): ParsedOptionModalValues {
	return {
		durationMinutes: parseInt(form.duration_minutes, 10),
		priceYouth: parseFloat(form.price_per_lesson_youth),
		priceAdult: parseFloat(form.price_per_lesson_adult),
	};
}

export function getOptionRowValidationError(
	option: { duration_minutes: string; price_per_lesson_youth: string; price_per_lesson_adult: string },
	index: number,
): string | null {
	const durationMinutes = parseInt(option.duration_minutes, 10);
	const priceYouth = parseFloat(option.price_per_lesson_youth);
	const priceAdult = parseFloat(option.price_per_lesson_adult);

	if (Number.isNaN(durationMinutes) || durationMinutes <= 0) {
		return `Optie ${index + 1}: duur moet een positief getal zijn`;
	}
	if (Number.isNaN(priceYouth) || priceYouth <= 0) {
		return `Optie ${index + 1}: prijs jongeren moet een positief getal zijn`;
	}
	if (Number.isNaN(priceAdult) || priceAdult <= 0) {
		return `Optie ${index + 1}: prijs volwassenen moet een positief getal zijn`;
	}

	return null;
}
