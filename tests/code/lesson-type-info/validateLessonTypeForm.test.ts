import { describe, expect, it } from 'bun:test';
import {
	buildLessonTypePayload,
	getLessonTypeFormValidationError,
} from '../../../src/pages/lesson-type-info/validateLessonTypeForm';
import type { LessonTypeFormState, LessonTypeOptionFormRow } from '../../../src/types/lesson-agreements';

const validForm: LessonTypeFormState = {
	name: 'Piano',
	description: 'Individuele pianolessen',
	icon: 'piano',
	color: '#FF5733',
	cost_center: 'CC-01',
	is_group_lesson: false,
	is_duo_lesson: false,
	is_active: true,
};

const validOption: LessonTypeOptionFormRow = {
	duration_minutes: '45',
	frequency: 'weekly',
	label: '',
	billing_kind: 'monthly',
	has_adult_tariff: true,
	effective_from: '2026-09-01',
	amount_under_21: '20.00',
	amount_adult: '25.00',
	tariffs: [],
};

describe('getLessonTypeFormValidationError', () => {
	it('returns null for a valid form with options', () => {
		expect(getLessonTypeFormValidationError(validForm, [validOption])).toBe(null);
	});

	it('requires a name', () => {
		expect(getLessonTypeFormValidationError({ ...validForm, name: '   ' }, [validOption])).toBe(
			'Naam is verplicht',
		);
	});

	it('requires an icon', () => {
		expect(getLessonTypeFormValidationError({ ...validForm, icon: '' }, [validOption])).toBe('Icoon is verplicht');
	});

	it('requires a color', () => {
		expect(getLessonTypeFormValidationError({ ...validForm, color: '' }, [validOption])).toBe('Kleur is verplicht');
	});

	it('requires a valid hex color', () => {
		expect(getLessonTypeFormValidationError({ ...validForm, color: 'red' }, [validOption])).toBe(
			'Kleur moet een hex code zijn (bijv. #FF5733)',
		);
	});

	it('requires at least one option', () => {
		expect(getLessonTypeFormValidationError(validForm, [])).toBe(
			'Voeg minimaal één optie toe (duur, frequentie, prijs)',
		);
	});

	it('delegates option row validation errors', () => {
		expect(
			getLessonTypeFormValidationError(validForm, [
				{
					...validOption,
					duration_minutes: 'abc',
				},
			]),
		).toBe('Optie 1: duur moet een positief getal zijn');
	});
});

describe('buildLessonTypePayload', () => {
	it('trims text fields and maps empty optional fields to null', () => {
		expect(
			buildLessonTypePayload({
				...validForm,
				name: '  Piano  ',
				description: '  ',
				cost_center: '  ',
			}),
		).toEqual({
			name: 'Piano',
			description: null,
			icon: 'piano',
			color: '#FF5733',
			cost_center: null,
			is_group_lesson: false,
			is_duo_lesson: false,
			is_active: true,
		});
	});
});
