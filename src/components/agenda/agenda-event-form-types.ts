import type { OccurrenceOverrides } from '@/lib/agenda/agendaEventFormHelpers';
import type { AgendaEventSourceType } from '@/types/agenda-events';

export type AgendaOccurrenceParticipantProfiles = Record<
	string,
	{ first_name: string | null; last_name: string | null; email: string | null }
> | null;

export interface AgendaEventFormCoreOptions {
	open: boolean;
	occurrenceDate?: string | null;
	occurrenceStartTime?: string | null;
	occurrenceEndTime?: string | null;
	occurrenceParticipantIds?: string[] | null;
	occurrenceParticipantProfiles?: AgendaOccurrenceParticipantProfiles;
	occurrenceOverrides?: OccurrenceOverrides | null;
	readonlyParticipantIds?: string[];
	onOpenChange: (open: boolean) => void;
}

export interface ProjectOption {
	id: string;
	name: string;
}

export interface AgendaEventFormPermissions {
	isManualEvent: boolean;
	isLessonEvent: boolean;
	isLessonGroupEvent: boolean;
	isProjectEvent: boolean;
	isRecurringEvent: boolean;
	isCancelledEvent: boolean;
	canDelete: boolean;
	canRevert: boolean;
	canCancelLesson: boolean;
	isTrialEvent: boolean;
	canMarkTrialCompleted: boolean;
}

export interface AgendaEventSourceSelection {
	selectedSourceType: AgendaEventSourceType;
	selectedProjectId: string | null;
	projectOptions: ProjectOption[];
	setSelectedProjectId: (id: string | null) => void;
	setSelectedSourceType: (type: AgendaEventSourceType) => void;
	effectiveSourceType: AgendaEventSourceType;
	effectiveSourceId: string | null;
	isProjectEvent: boolean;
}
