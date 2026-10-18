import { describe, expect, it } from 'bun:test';
import type { CalendarEventResource } from '../../../src/components/agenda/types';
import {
	buildAgendaEventTypeFlags,
	getAgendaEventDisplayTitle,
	getAgendaEventIconColorClass,
	getCancellationBanTitle,
	resolveAgendaEventIconType,
} from '../../../src/lib/agenda/agendaEventDisplay';

function baseResource(overrides: Partial<CalendarEventResource> = {}): CalendarEventResource {
	return {
		type: 'agenda',
		agreementId: 'agr-1',
		studentName: 'Jan Jansen',
		lessonTypeName: 'Piano',
		lessonTypeColor: '#000000',
		lessonTypeIcon: 'piano',
		isDeviation: false,
		isCancelled: false,
		isGroupLesson: false,
		...overrides,
	};
}

describe('getAgendaEventDisplayTitle', () => {
	it('prefixes title with time in month view', () => {
		expect(getAgendaEventDisplayTitle('month', new Date('2026-09-07T14:30:00'), 'Piano les')).toBe(
			'14:30 Piano les',
		);
	});

	it('returns title unchanged outside month view', () => {
		expect(getAgendaEventDisplayTitle('week', new Date('2026-09-07T14:30:00'), 'Piano les')).toBe('Piano les');
	});
});

describe('getAgendaEventIconColorClass', () => {
	it('returns dark text for light custom colors', () => {
		expect(getAgendaEventIconColorClass('#ffffff', null, baseResource())).toBe('text-gray-900');
	});

	it('returns white text for dark custom colors', () => {
		expect(getAgendaEventIconColorClass('#000000', null, baseResource())).toBe('text-white');
	});

	it('returns agenda foreground class for default manual events', () => {
		expect(getAgendaEventIconColorClass(null, null, baseResource({ type: 'agenda', lessonTypeColor: null }))).toBe(
			'text-agenda-manual-foreground',
		);
	});

	it('returns agenda foreground class for default lesson events', () => {
		expect(
			getAgendaEventIconColorClass(null, null, baseResource({ type: 'agreement', lessonTypeColor: null })),
		).toBe('text-agenda-lesson-foreground');
	});

	it('returns agenda foreground class for default group events', () => {
		expect(
			getAgendaEventIconColorClass(null, null, baseResource({ isGroupLesson: true, lessonTypeColor: null })),
		).toBe('text-agenda-group-foreground');
	});

	it('returns muted foreground in list agenda regardless of event colors', () => {
		expect(getAgendaEventIconColorClass('#000000', null, baseResource(), 'agenda')).toBe('text-muted-foreground');
		expect(
			getAgendaEventIconColorClass(
				null,
				null,
				baseResource({ type: 'agreement', lessonTypeColor: null }),
				'agenda',
			),
		).toBe('text-muted-foreground');
	});
});

describe('buildAgendaEventTypeFlags and resolveAgendaEventIconType', () => {
	it('resolves trial lesson icon', () => {
		const flags = buildAgendaEventTypeFlags(baseResource({ sourceType: 'trial_lesson' }));
		expect(resolveAgendaEventIconType(flags)).toBe('trial');
	});

	it('resolves project icon', () => {
		const flags = buildAgendaEventTypeFlags(baseResource({ sourceType: 'project' }));
		expect(resolveAgendaEventIconType(flags)).toBe('project');
	});

	it('resolves lesson group icon', () => {
		const flags = buildAgendaEventTypeFlags(baseResource({ sourceType: 'lesson_group' }));
		expect(resolveAgendaEventIconType(flags)).toBe('lesson_group');
	});

	it('resolves duo lesson icon', () => {
		const flags = buildAgendaEventTypeFlags(
			baseResource({ isLesson: true, sourceType: 'lesson_agreement', isDuoLesson: true }),
		);
		expect(resolveAgendaEventIconType(flags)).toBe('duo');
	});

	it('resolves single lesson icon', () => {
		const flags = buildAgendaEventTypeFlags(
			baseResource({ isLesson: true, sourceType: 'lesson_agreement', isDuoLesson: false }),
		);
		expect(resolveAgendaEventIconType(flags)).toBe('lesson');
	});

	it('resolves multi participant icon for manual events', () => {
		const flags = buildAgendaEventTypeFlags(
			baseResource({ sourceType: 'manual', participantCount: 3, isLesson: false }),
		);
		expect(resolveAgendaEventIconType(flags)).toBe('multi_participant');
	});

	it('returns null when no icon applies', () => {
		const flags = buildAgendaEventTypeFlags(baseResource({ sourceType: 'manual', participantCount: 1 }));
		expect(resolveAgendaEventIconType(flags)).toBeNull();
	});
});

describe('getCancellationBanTitle', () => {
	it('returns teacher cancellation title', () => {
		expect(getCancellationBanTitle(true)).toBe('Docent heeft afgezegd (inhalen vereist)');
	});

	it('returns student cancellation title', () => {
		expect(getCancellationBanTitle(false)).toBe('Leerling heeft afgezegd');
	});
});
