import { describe, expect, it } from 'bun:test';
import { mapTeacherDoc } from './mapTeacherHelpers';

describe('mapTeacherDoc', () => {
	it('maps a complete teacher document', () => {
		const result = mapTeacherDoc({
			_id: { $oid: '65deed9a4ab30f9a3714f069' },
			name: 'Femke',
			surname: 'Bosman',
			email: 'Thomas_Kok68_anon@kpnmail.nl',
			phone: '06-94350865',
			instrument: 'zang',
			note_to_teacher: 'Note one',
			comments: 'Comment two',
			assets: { $oid: '6658542bcf2cb83e6b75993c' },
			user: '70e1238b-11e5-4a6d-8711-ff550716e7a6',
		});

		expect(result).toEqual({
			ok: true,
			row: {
				mongoOid: '65deed9a4ab30f9a3714f069',
				email: 'Thomas_Kok68_anon@kpnmail.nl',
				firstName: 'Femke',
				lastName: 'Bosman',
				phoneNumber: '0694350865',
				bio: 'Note one\nComment two',
				lessonTypeNames: ['Zangles'],
				unmatchedInstruments: [],
			},
		});
	});

	it('warns via unmatchedInstruments when instrument cannot be linked', () => {
		const result = mapTeacherDoc({
			_id: { $oid: 'oid-studio' },
			name: 'Sem',
			surname: 'Prinsen',
			email: 'sem@example.com',
			instrument: 'studio / concierge',
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.row.lessonTypeNames).toEqual([]);
			expect(result.row.unmatchedInstruments).toEqual(['studio', 'concierge']);
		}
	});

	it('fails without email', () => {
		const result = mapTeacherDoc({
			_id: { $oid: '65deed9a4ab30f9a3714f071' },
			name: 'Roos',
			surname: 'de Jong',
			email: '',
			phone: '',
		});
		expect(result).toEqual({
			ok: false,
			oid: '65deed9a4ab30f9a3714f071',
			reason: 'Missing email',
		});
	});

	it('sets invalid phone to null without failing', () => {
		const result = mapTeacherDoc({
			_id: { $oid: 'oid-1' },
			name: 'Noa',
			surname: 'Noa',
			email: 'noa@example.com',
			phone: '070-8360593',
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.row.phoneNumber).toBeNull();
		}
	});
});
