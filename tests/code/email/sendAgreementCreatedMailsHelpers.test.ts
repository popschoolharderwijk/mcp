import { describe, expect, it } from 'bun:test';
import {
	AGREEMENT_MAIL_UNKNOWN_ROOM,
	buildAgreementMailContext,
	buildAgreementMailInvokeBody,
	resolveAgreementRoomLabel,
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
			AGREEMENT_MAIL_UNKNOWN_ROOM,
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
			AGREEMENT_MAIL_UNKNOWN_ROOM,
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
			'Studio',
		);
		expect(context.sharedVars.leerling_naam).toBe('Jan Leerling');
		expect(context.sharedVars.docent_naam).toBe('Piet Docent');
		expect(context.sharedVars.les_type).toBe('Piano');
		expect(context.sharedVars.frequentie).toBe('wekelijks');
		expect(context.sharedVars.prijs_per_les).toContain('45');
		expect(context.sharedVars.dag).toBe('maandag');
		expect(context.sharedVars.tijd).toBe('14:30');
		expect(context.sharedVars.lokaal).toBe('Studio');
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
			AGREEMENT_MAIL_UNKNOWN_ROOM,
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
			'Studio',
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

describe('resolveAgreementRoomLabel', () => {
	const slots = [
		{ start_time: '09:00:00', end_time: '12:00:00', room_name: 'Studio' },
		{ start_time: '11:00:00', end_time: '13:00:00', room_name: 'Drumlokaal' },
		{ start_time: '15:00:00', end_time: '17:00:00', room_name: null },
		{ start_time: '17:00:00', end_time: '18:00:00', room_name: '   ' },
	];

	it('uses the room of the slot that contains the lesson start', () => {
		expect(resolveAgreementRoomLabel(slots, '10:15:00')).toBe('Studio');
	});

	it('prefers the containing slot with the latest start', () => {
		expect(resolveAgreementRoomLabel(slots, '11:30')).toBe('Drumlokaal');
	});

	it('returns onbekend when the matching slot has no room', () => {
		expect(resolveAgreementRoomLabel(slots, '15:00:00')).toBe(AGREEMENT_MAIL_UNKNOWN_ROOM);
	});

	it('returns onbekend when the matching room name is blank', () => {
		expect(resolveAgreementRoomLabel(slots, '17:00:00')).toBe(AGREEMENT_MAIL_UNKNOWN_ROOM);
	});

	it('returns onbekend when no slot contains the lesson start', () => {
		expect(resolveAgreementRoomLabel(slots, '13:00:00')).toBe(AGREEMENT_MAIL_UNKNOWN_ROOM);
		expect(resolveAgreementRoomLabel(slots, '08:00:00')).toBe(AGREEMENT_MAIL_UNKNOWN_ROOM);
	});

	it('returns onbekend when the lesson start is not a time', () => {
		expect(resolveAgreementRoomLabel(slots, '')).toBe(AGREEMENT_MAIL_UNKNOWN_ROOM);
	});
});
