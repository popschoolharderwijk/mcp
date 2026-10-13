import { describe, expect, it } from 'bun:test';
import {
	buildAgreementMailContext,
	buildAgreementMailInvokeBody,
	buildAgreementMailTargets,
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
				payment_method: 'stripe',
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
				payment_method: 'stripe',
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
				payment_method: 'stripe',
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
		expect(context.sharedVars.betaalmethode).toBe('Stripe (iDEAL + automatische incasso)');
	});

	it('returns empty price and date for nullish inputs', () => {
		const context = buildAgreementMailContext(
			{
				day_of_week: 0,
				start_time: '',
				start_date: '',
				frequency: 'custom',
				price_per_lesson: null,
				payment_method: 'manual',
				lesson_types: null,
			},
			{ first_name: 'S', last_name: '' },
			{ first_name: 'T', last_name: '' },
		);
		expect(context.sharedVars.prijs_per_les).toBe('');
		expect(context.sharedVars.tijd).toBe('');
		expect(context.sharedVars.startdatum).toBe('');
		expect(context.sharedVars.frequentie).toBe('custom');
		expect(context.sharedVars.betaalmethode).toBe('Handmatige facturatie');
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
				payment_method: 'stripe',
				lesson_types: { name: 'Piano' },
			},
			{ first_name: 'Jan', last_name: 'Leerling' },
			{ first_name: 'Piet', last_name: 'Docent' },
		);
		expect(buildAgreementMailInvokeBody('agreement_created', 'Jan@Example.com', context.sharedVars)).toEqual({
			event_key: 'agreement_created',
			to: 'jan@example.com',
			vars: context.sharedVars,
		});
	});
});

describe('buildAgreementMailTargets', () => {
	it('returns student and teacher targets when both emails exist', () => {
		expect(buildAgreementMailTargets('stu@example.com', 'tea@example.com')).toEqual([
			{ eventKey: 'agreement_created', email: 'stu@example.com' },
			{ eventKey: 'agreement_created_teacher', email: 'tea@example.com' },
		]);
	});

	it('returns only student target when teacher email is missing', () => {
		expect(buildAgreementMailTargets('stu@example.com', null)).toEqual([
			{ eventKey: 'agreement_created', email: 'stu@example.com' },
		]);
	});

	it('returns empty list when both emails are missing', () => {
		expect(buildAgreementMailTargets(null, undefined)).toEqual([]);
	});
});
