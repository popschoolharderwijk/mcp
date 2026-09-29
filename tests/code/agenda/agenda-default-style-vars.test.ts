import { describe, expect, it } from 'bun:test';
import type { CalendarEventResource } from '../../../src/components/agenda/types';
import {
	agendaDefaultForegroundClass,
	agendaDefaultStyleVars,
	resolveAgendaDefaultKind,
} from '../../../src/lib/agenda/agenda-default-style-vars';

function baseResource(overrides: Partial<CalendarEventResource> = {}): CalendarEventResource {
	return {
		type: 'agreement',
		agreementId: 'agr-1',
		studentName: 'Jan',
		lessonTypeName: 'Piano',
		lessonTypeColor: null,
		lessonTypeIcon: 'piano',
		isDeviation: false,
		isCancelled: false,
		isGroupLesson: false,
		...overrides,
	};
}

describe('resolveAgendaDefaultKind', () => {
	it('returns null when custom color is set', () => {
		expect(resolveAgendaDefaultKind(baseResource({ color: '#ff0000' }))).toBeNull();
	});

	it('returns null when only lessonTypeColor is set', () => {
		expect(resolveAgendaDefaultKind(baseResource({ lessonTypeColor: '#10b981' }))).toBeNull();
	});

	it('returns group for group lessons without custom color', () => {
		expect(resolveAgendaDefaultKind(baseResource({ isGroupLesson: true }))).toBe('group');
	});

	it('returns manual for agenda type events', () => {
		expect(resolveAgendaDefaultKind(baseResource({ type: 'agenda' }))).toBe('manual');
	});

	it('returns lesson for default agreement events', () => {
		expect(resolveAgendaDefaultKind(baseResource({ type: 'agreement' }))).toBe('lesson');
	});
});

describe('agendaDefaultStyleVars', () => {
	it('returns CSS token strings for lesson kind', () => {
		expect(agendaDefaultStyleVars('lesson')).toEqual({
			backgroundColor: 'hsl(var(--agenda-lesson))',
			borderColor: 'var(--agenda-lesson-border)',
			color: 'hsl(var(--agenda-lesson-foreground))',
		});
	});

	it('returns CSS token strings for manual kind', () => {
		expect(agendaDefaultStyleVars('manual')).toEqual({
			backgroundColor: 'hsl(var(--agenda-manual))',
			borderColor: 'var(--agenda-manual-border)',
			color: 'hsl(var(--agenda-manual-foreground))',
		});
	});

	it('returns CSS token strings for group kind', () => {
		expect(agendaDefaultStyleVars('group')).toEqual({
			backgroundColor: 'hsl(var(--agenda-group))',
			borderColor: 'var(--agenda-group-border)',
			color: 'hsl(var(--agenda-group-foreground))',
		});
	});
});

describe('agendaDefaultForegroundClass', () => {
	it('returns literal tailwind class names', () => {
		expect(agendaDefaultForegroundClass('lesson')).toBe('text-agenda-lesson-foreground');
		expect(agendaDefaultForegroundClass('manual')).toBe('text-agenda-manual-foreground');
		expect(agendaDefaultForegroundClass('group')).toBe('text-agenda-group-foreground');
	});
});
