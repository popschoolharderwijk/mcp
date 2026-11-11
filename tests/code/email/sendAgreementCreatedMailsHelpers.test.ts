import { describe, expect, it } from 'bun:test';
import {
	buildAgreementMailContext,
	buildAgreementMailInvokeBody,
} from '../../../src/lib/email/sendAgreementCreatedMailsHelpers';

describe('buildAgreementMailContext', () => {
	it('joins profile names with fallbacks', () => {
		const context = buildAgreementMailContext(
			{
				day_of_week: 1,
				start_time: '14:30:00',
				start_date: '2026-09-07',
				frequency: 'weekly',
				price_per_lesson: 45,
				lesson_types: { name: 'Piano' },
			},
			{ first_name: 'Jan', last_name: 'Docent' },
			null,
		);
		expect(context.studentName).toBe('Jan Docent');
		expect(context.teacherName).toBe('docent');
		expect(context.lessonType).toBe('Piano');
	});

	it('reads lesson type name from array relation', () => {
		const context = buildAgreementMailContext(
			{
				day_of_week: 1,
				start_time: '14:30:00',
				start_date: '2026-09-07',
				frequency: 'weekly',
				price_per_lesson: 45,
				lesson_types: [{ name: 'Gitaar' }],
			},
			null,
			null,
		);
		expect(context.lessonType).toBe('Gitaar');
	});

	it('builds shared template vars with Dutch labels', () => {
		const context = buildAgreementMailContext(
			{
				day_of_week: 1,
				start_time: '14:30:00',
				start_date: '2026-09-07',
				frequency: 'weekly',
				price_per_lesson: 45,
				lesson_types: { name: 'Piano' },
			},
			{ first_name: 'Jan', last_name: 'Leerling' },
			{ first_name: 'Piet', last_name: 'Docent' },
		);
		expect(context.sharedVars.leerling_naam).toBe('Jan Leerling');
		expect(context.sharedVars.docent_naam).toBe('Piet Docent');
		expect(context.sharedVars.les_type).toBe('Piano');
		expect(context.sharedVars.frequentie).toBe('wekelijks');
		expect(context.sharedVars.prijs_per_les).toContain('45');
		expect(context.sharedVars.dag).toBe('maandag');
		expect(context.sharedVars.tijd).toBe('14:30');
		expect(context.sharedVars.startdatum).toBe('07-09-2026');
		expect(context.sharedVars.betaalmethode).toBe('Stripe');
	});

	it('returns empty price and date for nullish inputs', () => {
		const context = buildAgreementMailContext(
			{
				day_of_week: 0,
				start_time: '',
				start_date: '',
				frequency: 'custom',
				price_per_lesson: null,
				lesson_types: null,
			},
			{ first_name: 'S', last_name: '' },
			{ first_name: 'T', last_name: '' },
		);
		expect(context.sharedVars.prijs_per_les).toBe('');
		expect(context.sharedVars.tijd).toBe('');
		expect(context.sharedVars.startdatum).toBe('');
		expect(context.sharedVars.frequentie).toBe('custom');
		expect(context.sharedVars.betaalmethode).toBe('Stripe');
	});
});

describe('buildAgreementMailInvokeBody', () => {
	it('builds the send-template-email payload with lowercased email', () => {
		const context = buildAgreementMailContext(
			{
				day_of_week: 1,
				start_time: '14:30:00',
				start_date: '2026-09-07',
				frequency: 'weekly',
				price_per_lesson: 45,
				lesson_types: { name: 'Piano' },
			},
			{ first_name: 'Jan', last_name: 'Leerling' },
			{ first_name: 'Piet', last_name: 'Docent' },
		);
		expect(
			buildAgreementMailInvokeBody('agreement_created_teacher', 'Jan@Example.com', context.sharedVars),
		).toEqual({
			event_key: 'agreement_created_teacher',
			to: 'jan@example.com',
			vars: context.sharedVars,
		});
	});
});
