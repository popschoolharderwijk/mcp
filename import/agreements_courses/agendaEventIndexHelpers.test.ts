import { describe, expect, it } from 'bun:test';
import { buildAgendaLessonDatesByAgreementOid } from './agendaEventIndexHelpers';

describe('buildAgendaLessonDatesByAgreementOid', () => {
	it('indexes lesson dates per agreement and skips non-lessons', () => {
		const map = buildAgendaLessonDatesByAgreementOid([
			{
				type: 'lesson',
				start: { $date: '2026-10-28T13:00:00Z' },
				agreements_course: { $oid: 'agr-1' },
			},
			{
				type: 'lesson',
				start: { $date: '2026-10-07T12:00:00Z' },
				agreements_course: { $oid: 'agr-1' },
			},
			{
				type: 'other',
				start: { $date: '2026-10-14T12:00:00Z' },
				agreements_course: { $oid: 'agr-1' },
			},
			{
				type: 'lesson',
				start: { $date: '2026-11-04T12:00:00Z' },
				agreements_course: { $oid: 'agr-2' },
			},
		]);

		expect(map.get('agr-1')).toEqual(['2026-10-07', '2026-10-28']);
		expect(map.get('agr-2')).toEqual(['2026-11-04']);
	});
});
