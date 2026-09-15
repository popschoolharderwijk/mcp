import type { PostgrestError } from '@supabase/supabase-js';
import { differenceInDays, parseISO } from 'date-fns';
import type { RecurrenceScope } from '@/components/agenda/RecurrenceChoiceDialog';
import type { CalendarEvent } from '@/components/agenda/types';
import { supabase } from '@/integrations/supabase/client';
import { PostgresErrorCodes } from '@/integrations/supabase/errorcodes';
import { getAgendaLessonContext, lookupAgendaEvent } from '@/lib/agenda/agendaEventLookup';
import { addDaysToDateStr, formatDateToDb } from '@/lib/date/date-format';
import { normalizeTime, normalizeTimeFromDate } from '@/lib/time/time-format';
import type { AgendaEventDeviationRow, AgendaEventRow } from '@/types/agenda-events';

/** Minimal agreement shape needed for move logic (start_time). */
export interface AgendaAgreementLike {
	start_time: string;
}

export interface MoveAgendaEventParams {
	event: CalendarEvent;
	start: Date;
	end: Date;
	scope: RecurrenceScope;
	user: { id: string };
	agendaEvents: AgendaEventRow[];
	deviations: AgendaEventDeviationRow[];
	agreementsMap: Map<string, AgendaAgreementLike>;
}

export type MoveAgendaEventResult = { ok: true; message: string } | { ok: false; message: string };

interface MoveSlot {
	actualDateStr: string;
	actualStartTime: string;
	actualEndDate: string;
	actualEndTime: string;
}

interface OriginalSlot {
	originalDateStr: string;
	originalStartTime: string;
}

interface RecurringMoveContext {
	event: CalendarEvent;
	agendaEvent: AgendaEventRow;
	slot: MoveSlot;
	scope: RecurrenceScope;
	deviations: AgendaEventDeviationRow[];
	agreementsMap: Map<string, AgendaAgreementLike>;
}

function buildMoveSlot(start: Date, end: Date): MoveSlot {
	return {
		actualDateStr: formatDateToDb(start),
		actualStartTime: normalizeTimeFromDate(start),
		actualEndDate: formatDateToDb(end),
		actualEndTime: normalizeTimeFromDate(end),
	};
}

function isDeviationDateCheckError(error: PostgrestError): boolean {
	return (
		error.code === PostgresErrorCodes.CHECK_VIOLATION ||
		(error.message ?? '').toLowerCase().includes('deviation_date_check')
	);
}

function resolveOriginalSlot(event: CalendarEvent, baseStartTime: string, fallbackDateStr: string): OriginalSlot {
	if (event.resource.isDeviation && event.resource.originalDate && event.resource.originalStartTime) {
		return {
			originalDateStr: event.resource.originalDate,
			originalStartTime: event.resource.originalStartTime,
		};
	}
	return {
		originalDateStr: event.start ? formatDateToDb(event.start) : fallbackDateStr,
		originalStartTime: normalizeTime(baseStartTime),
	};
}

function findExistingDeviation(
	event: CalendarEvent,
	eventId: string,
	originalDateStr: string,
	deviations: AgendaEventDeviationRow[],
): { existingDeviation: AgendaEventDeviationRow | null; deviationById: AgendaEventDeviationRow | null } {
	const deviationById = event.resource.deviationId
		? (deviations.find((d) => d.id === event.resource.deviationId) ?? null)
		: null;
	const existingDeviation =
		deviationById?.original_date === originalDateStr
			? deviationById
			: (deviations.find((d) => d.event_id === eventId && d.original_date === originalDateStr) ?? null);
	return { existingDeviation, deviationById };
}

function isDroppedOnSameSlot(
	existingDeviation: AgendaEventDeviationRow | null,
	event: CalendarEvent,
	actualDateStr: string,
	actualStartTime: string,
): boolean {
	if (existingDeviation) {
		return (
			actualDateStr === existingDeviation.actual_date &&
			normalizeTime(actualStartTime) === normalizeTime(existingDeviation.actual_start_time)
		);
	}
	return (
		!!event.start &&
		actualDateStr === formatDateToDb(event.start) &&
		normalizeTime(actualStartTime) === normalizeTimeFromDate(event.start)
	);
}

function isRestoringToOriginal(original: OriginalSlot, actualDateStr: string, actualStartTime: string): boolean {
	return (
		original.originalDateStr === actualDateStr &&
		normalizeTime(original.originalStartTime) === normalizeTime(actualStartTime)
	);
}

async function moveNonRecurring(agendaEvent: AgendaEventRow, slot: MoveSlot): Promise<MoveAgendaEventResult> {
	const { error } = await supabase
		.from('agenda_events')
		.update({
			start_date: slot.actualDateStr,
			start_time: slot.actualStartTime,
			end_date: slot.actualEndDate,
			end_time: slot.actualEndTime,
		})
		.eq('id', agendaEvent.id);

	if (error) return { ok: false, message: 'Afspraak verplaatsen mislukt' };
	return { ok: true, message: 'Afspraak verplaatst' };
}

async function moveEntireSeries(
	eventId: string,
	agendaEvent: AgendaEventRow,
	original: OriginalSlot,
	slot: MoveSlot,
	restoring: boolean,
	deviations: AgendaEventDeviationRow[],
): Promise<MoveAgendaEventResult> {
	if (restoring) {
		const eventDeviations = deviations.filter((d) => d.event_id === eventId);
		if (eventDeviations.length > 0) {
			const { error } = await supabase.from('agenda_event_deviations').delete().eq('event_id', eventId);
			if (error) return { ok: false, message: 'Fout bij terugzetten reeks' };
			return { ok: true, message: 'Alle afspraken teruggezet naar originele planning' };
		}
		return { ok: true, message: '' };
	}

	const offsetDays = differenceInDays(parseISO(original.originalDateStr), parseISO(agendaEvent.start_date));
	const newStartDate = addDaysToDateStr(slot.actualDateStr, -offsetDays);
	const newEndDate = addDaysToDateStr(slot.actualEndDate, -offsetDays);
	const { error: updateError } = await supabase
		.from('agenda_events')
		.update({
			start_date: newStartDate,
			start_time: slot.actualStartTime,
			end_date: newEndDate,
			end_time: slot.actualEndTime,
		})
		.eq('id', eventId);
	if (updateError) return { ok: false, message: 'Fout bij verplaatsen reeks' };
	const { error: deleteError } = await supabase.from('agenda_event_deviations').delete().eq('event_id', eventId);
	if (deleteError) return { ok: false, message: 'Fout bij bijwerken afwijkingen' };
	return { ok: true, message: 'Alle afspraken verplaatst' };
}

async function restoreToOriginalSlot(
	eventId: string,
	originalDateStr: string,
	recurring: boolean,
): Promise<MoveAgendaEventResult> {
	const scopeParam = recurring ? 'this_and_future' : 'only_this';
	const { data: result, error } = await supabase.rpc('ensure_week_shows_original_slot', {
		p_event_id: eventId,
		p_week_date: originalDateStr,
		p_scope: scopeParam,
	});
	if (error) return { ok: false, message: 'Fout bij terugzetten' };
	const message =
		result === 'recurring_deleted'
			? 'Terugkerende wijziging verwijderd'
			: result === 'recurring_ended'
				? 'Terugkerende wijziging beëindigd vanaf deze week'
				: 'Afspraak teruggezet naar originele planning';
	return { ok: true, message };
}

async function updateExistingDeviation(
	existingDeviation: AgendaEventDeviationRow,
	slot: MoveSlot,
	recurring: boolean,
): Promise<MoveAgendaEventResult> {
	const { error } = await supabase
		.from('agenda_event_deviations')
		.update({
			actual_date: slot.actualDateStr,
			actual_start_time: slot.actualStartTime,
			spans_future_occurrences: recurring,
		})
		.eq('id', existingDeviation.id);
	if (error) {
		return {
			ok: false,
			message: isDeviationDateCheckError(error)
				? 'Afspraak kan niet in het verleden worden geplaatst.'
				: 'Fout bij bijwerken afwijking',
		};
	}
	return { ok: true, message: 'Afspraak bijgewerkt' };
}

async function truncateRecurringDeviation(
	deviationById: AgendaEventDeviationRow,
	originalDateStr: string,
): Promise<MoveAgendaEventResult | null> {
	const endDate = addDaysToDateStr(originalDateStr, -1);
	const { error: updateErr } = await supabase
		.from('agenda_event_deviations')
		.update({ spans_end_date: endDate })
		.eq('id', deviationById.id);
	if (updateErr) return { ok: false, message: `Fout bij bijwerken afwijking: ${updateErr.message}` };
	return null;
}

function isUniqueDeviationError(error: PostgrestError): boolean {
	return error.code === PostgresErrorCodes.UNIQUE_VIOLATION || (error.message ?? '').toLowerCase().includes('unique');
}

function mapCreateDeviationError(createError: PostgrestError): string {
	if (isDeviationDateCheckError(createError)) return 'Afspraak kan niet in het verleden worden geplaatst.';
	if (isUniqueDeviationError(createError)) return 'Deze afwijking bestaat al.';
	return `Fout bij aanmaken afwijking: ${createError.message}`;
}

async function createDeviation(
	eventId: string,
	agendaEvent: AgendaEventRow,
	original: OriginalSlot,
	slot: MoveSlot,
	recurring: boolean,
	deviationById: AgendaEventDeviationRow | null,
): Promise<MoveAgendaEventResult> {
	if (recurring && deviationById && deviationById.original_date !== original.originalDateStr) {
		const truncateResult = await truncateRecurringDeviation(deviationById, original.originalDateStr);
		if (truncateResult) return truncateResult;
	}

	const payload = {
		event_id: eventId,
		original_date: original.originalDateStr,
		original_start_time: normalizeTime(original.originalStartTime || agendaEvent.start_time),
		actual_date: slot.actualDateStr,
		actual_start_time: slot.actualStartTime,
		spans_future_occurrences: recurring,
	};
	const { error: createError } = await supabase
		.from('agenda_event_deviations')
		.upsert(payload, { onConflict: 'event_id,original_date' });
	if (createError) return { ok: false, message: mapCreateDeviationError(createError) };
	return { ok: true, message: 'Afspraak verplaatst' };
}

async function moveRecurringEvent(ctx: RecurringMoveContext): Promise<MoveAgendaEventResult> {
	const { event, agendaEvent, slot, scope, deviations, agreementsMap } = ctx;
	const eventId = agendaEvent.id;
	const recurring = scope === 'thisAndFuture';
	const baseStartTime = getAgendaLessonContext(agendaEvent, agreementsMap).baseStartTime;
	const original = resolveOriginalSlot(event, baseStartTime, slot.actualDateStr);
	const { existingDeviation, deviationById } = findExistingDeviation(
		event,
		eventId,
		original.originalDateStr,
		deviations,
	);

	if (isDroppedOnSameSlot(existingDeviation, event, slot.actualDateStr, slot.actualStartTime)) {
		return { ok: true, message: '' };
	}

	const restoring = isRestoringToOriginal(original, slot.actualDateStr, slot.actualStartTime);

	if (scope === 'all') {
		return moveEntireSeries(eventId, agendaEvent, original, slot, restoring, deviations);
	}

	if (restoring) {
		if (existingDeviation) {
			return restoreToOriginalSlot(eventId, original.originalDateStr, recurring);
		}
		return { ok: true, message: '' };
	}

	if (existingDeviation) {
		return updateExistingDeviation(existingDeviation, slot, recurring);
	}

	return createDeviation(eventId, agendaEvent, original, slot, recurring, deviationById);
}

export async function moveAgendaEvent(params: MoveAgendaEventParams): Promise<MoveAgendaEventResult> {
	const { event, start, end, scope, agendaEvents, deviations, agreementsMap } = params;
	const lookup = lookupAgendaEvent(event.resource.eventId, agendaEvents);
	if ('ok' in lookup) return lookup;

	const slot = buildMoveSlot(start, end);
	if (!lookup.event.recurring) {
		return moveNonRecurring(lookup.event, slot);
	}

	return moveRecurringEvent({
		event,
		agendaEvent: lookup.event,
		slot,
		scope,
		deviations,
		agreementsMap,
	});
}
