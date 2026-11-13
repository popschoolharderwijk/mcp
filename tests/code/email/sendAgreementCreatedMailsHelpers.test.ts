import { describe, expect, it } from 'bun:test';
import {
	AGREEMENT_MAIL_UNKNOWN_ROOM,
	resolveAgreementRoomLabel,
} from '../../../src/lib/email/sendAgreementCreatedMailsHelpers';

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
