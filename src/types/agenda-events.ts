/**
 * Centralized type definitions for agenda events, participants, and deviations.
 * Based on Supabase generated types.
 */

import type { Insert } from '@/integrations/supabase/insert-helpers';
import type { Enums, Tables } from '@/integrations/supabase/types';

export type AgendaEventRow = Tables<'agenda_events'>;
export type AgendaEventInsert = Insert<'agenda_events'>;

export type AgendaEventDeviationRow = Tables<'agenda_event_deviations'>;

/** Source type for agenda_events (from DB enum). */
export type AgendaEventSourceType = Enums<'agenda_event_source_type'>;

/** Cancellation type for deviations (from DB enum). */
export type CancellationType = 'student' | 'teacher';

/** Info about a deviation (for recurring events that have been moved or cancelled). */
export interface DeviationInfo {
	deviationId: string;
	originalDate: string;
	originalStartTime: string;
	isCancelled?: boolean;
	/** True when actual date/time differs from original (show "Gewijzigde afspraak" only then). */
	hasTimeOrDateChange?: boolean;
	/** Same-slot merge: number of separate lessons before they shared this slot. */
	originalSeparateLessonCount?: number;
}

/** Scope for delete/cancel operations on recurring events */
export type DeleteScope = 'single' | 'thisAndFuture' | 'all';
