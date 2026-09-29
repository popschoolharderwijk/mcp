import type { CalendarEventResource } from '@/components/agenda/types';

export type AgendaDefaultKind = 'lesson' | 'manual' | 'group';

export function resolveAgendaDefaultKind(resource: CalendarEventResource): AgendaDefaultKind | null {
	const customColor = resource.color || resource.lessonTypeColor;
	if (customColor) {
		return null;
	}
	if (resource.isGroupLesson) {
		return 'group';
	}
	if (resource.type === 'agenda') {
		return 'manual';
	}
	return 'lesson';
}

const AGENDA_DEFAULT_BACKGROUND: Record<AgendaDefaultKind, string> = {
	lesson: 'hsl(var(--agenda-lesson))',
	manual: 'hsl(var(--agenda-manual))',
	group: 'hsl(var(--agenda-group))',
};

const AGENDA_DEFAULT_FOREGROUND: Record<AgendaDefaultKind, string> = {
	lesson: 'hsl(var(--agenda-lesson-foreground))',
	manual: 'hsl(var(--agenda-manual-foreground))',
	group: 'hsl(var(--agenda-group-foreground))',
};

const AGENDA_DEFAULT_BORDER: Record<AgendaDefaultKind, string> = {
	lesson: 'var(--agenda-lesson-border)',
	manual: 'var(--agenda-manual-border)',
	group: 'var(--agenda-group-border)',
};

export function agendaDefaultStyleVars(kind: AgendaDefaultKind): {
	backgroundColor: string;
	borderColor: string;
	color: string;
} {
	return {
		backgroundColor: AGENDA_DEFAULT_BACKGROUND[kind],
		borderColor: AGENDA_DEFAULT_BORDER[kind],
		color: AGENDA_DEFAULT_FOREGROUND[kind],
	};
}

export function agendaDefaultForegroundClass(kind: AgendaDefaultKind): string {
	switch (kind) {
		case 'lesson':
			return 'text-agenda-lesson-foreground';
		case 'manual':
			return 'text-agenda-manual-foreground';
		case 'group':
			return 'text-agenda-group-foreground';
	}
}
