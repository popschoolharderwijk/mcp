import { describe, expect, it } from 'bun:test';
import type { CalendarEventResource } from '../../../src/components/agenda/types';
import {
	buildTooltipFirstLine,
	buildTooltipParticipantLines,
	buildTooltipStatusLines,
} from '../../../src/lib/agenda/tooltipHelpers';

const baseResource: CalendarEventResource = {
	type: 'agreement',
	agreementId: 'agr-1',
	studentName: 'Anna Bakker',
	lessonTypeName: 'Piano',
	lessonTypeColor: '#000000',
	lessonTypeIcon: null,
	isDeviation: false,
	isCancelled: false,
	isGroupLesson: false,
	isLesson: true,
	teacherName: 'Jan Docent',
	viewerIsTeacher: false,
	sourceType: 'lesson_agreement',
};

describe('buildTooltipFirstLine', () => {
	it('returns lesson type for regular events', () => {
		expect(buildTooltipFirstLine('Les', baseResource)).toBe('Piano');
	});

	it('returns project title for project events', () => {
		expect(
			buildTooltipFirstLine('Projectdag', {
				...baseResource,
				sourceType: 'project',
			}),
		).toBe('📁 Projectdag');
	});
});

describe('buildTooltipParticipantLines', () => {
	it('shows teacher and student labels for single lessons', () => {
		expect(buildTooltipParticipantLines(baseResource)).toEqual(['Docent: Jan Docent', 'Leerling: Anna Bakker']);
	});

	it('shows teacher and both students for duo lessons', () => {
		expect(
			buildTooltipParticipantLines({
				...baseResource,
				isDuoLesson: true,
				studentName: 'Anna Bakker & Bob Jansen',
			}),
		).toEqual(['Docent: Jan Docent', 'Leerlingen: Anna Bakker, Bob Jansen']);
	});

	it('lists group lesson participants', () => {
		expect(
			buildTooltipParticipantLines({
				...baseResource,
				isGroupLesson: true,
				studentCount: 2,
				studentName: 'Anna Bakker, Bob Jansen',
			}),
		).toEqual(['Docent: Jan Docent', '2 leerlingen:', '  • Anna Bakker', '  • Bob Jansen']);
	});
});

describe('buildTooltipStatusLines', () => {
	it('returns cancelled status with reason', () => {
		expect(
			buildTooltipStatusLines({
				...baseResource,
				isCancelled: true,
				reason: 'Ziek',
			}),
		).toEqual(['', '❌ Les vervallen', 'Reden: Ziek']);
	});

	it('returns changed appointment details', () => {
		expect(
			buildTooltipStatusLines({
				...baseResource,
				hasTimeOrDateChange: true,
				originalDate: '2026-09-07',
				originalStartTime: '09:00:00',
				reason: 'Verplaatst',
			}),
		).toEqual(['', '⚠ Gewijzigde afspraak', 'Origineel: maandag 7 september om 09:00', 'Reden: Verplaatst']);
	});
});
