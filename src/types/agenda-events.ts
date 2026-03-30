/**
 * Centralized type definitions for agenda events, participants, and deviations.
 * Based on Supabase generated types.
 */

import type { Insert, Update } from '@/integrations/supabase/insert-helpers';
import type { Enums, Tables } from '@/integrations/supabase/types';

export type AgendaEventRow = Tables<'agenda_events'>;
export type AgendaEventInsert = Insert<'agenda_events'>;
export type AgendaEventUpdate = Update<'agenda_events'>;

export type AgendaParticipantRow = Tables<'agenda_participants'>;
export type AgendaParticipantInsert = Insert<'agenda_participants'>;

export type AgendaEventDeviationRow = Tables<'agenda_event_deviations'>;
export type AgendaEventDeviationInsert = Insert<'agenda_event_deviations'>;
export type AgendaEventDeviationUpdate = Update<'agenda_event_deviations'>;

/** Source type for agenda_events (from DB enum). */
export type AgendaEventSourceType = Enums<'agenda_event_source_type'>;

/** Cancellation type for deviations (from DB enum). */
export type CancellationType = 'student' | 'teacher';

/** Runtime values for agenda_event_source_type (must match DB enum). */
const AGENDA_EVENT_SOURCE_TYPE_VALUES: readonly string[] = ['manual', 'lesson_agreement', 'project'];

/** Narrow string (e.g. from Select) to {@link AgendaEventSourceType}. */
export function isAgendaEventSourceType(v: string): v is AgendaEventSourceType {
	return AGENDA_EVENT_SOURCE_TYPE_VALUES.includes(v);
}

/** Agenda event with participants joined (for display) */
export interface AgendaEventWithParticipants extends AgendaEventRow {
	participants?: AgendaParticipantRow[];
}

/** Deviation with its agenda event (for calendar logic) */
export interface AgendaEventDeviationWithEvent extends AgendaEventDeviationRow {
	agenda_event: AgendaEventRow;
}

/** Info about a deviation (for recurring events that have been moved or cancelled). */
export interface DeviationInfo {
	deviationId: string;
	originalDate: string;
	originalStartTime: string;
	isCancelled?: boolean;
	/** True when actual date/time differs from original (show "Gewijzigde afspraak" only then). */
	hasTimeOrDateChange?: boolean;
}

/** Scope for delete/cancel operations on recurring events */
export type DeleteScope = 'single' | 'thisAndFuture' | 'all';
