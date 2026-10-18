import type { User } from '@supabase/supabase-js';
import { useEffect, useMemo } from 'react';
import { buildAgendaViewDerivedState } from '@/components/agenda/agendaViewDerivedState';
import { useAgendaViewHandlers } from '@/components/agenda/useAgendaViewHandlers';
import { useAgendaData } from '@/hooks/useAgendaData';
import { useAgendaUI } from '@/hooks/useAgendaUI';
import { buildCalendarEvents } from '@/lib/agenda/buildCalendarEvents';
import { getCalendarProps } from '@/lib/agenda/calendarProps';
import { resolveAgendaScrollToTime } from '@/lib/agenda/resolveAgendaScrollToTime';

interface UseAgendaViewModelParams {
	effectiveUserId: string | undefined;
	canEdit: boolean;
	canManageAgenda: boolean;
	isPrivileged: boolean;
	user: User | null;
}

export function useAgendaViewModel(params: UseAgendaViewModelParams) {
	const { effectiveUserId, canEdit, canManageAgenda, isPrivileged, user } = params;
	const agendaData = useAgendaData(effectiveUserId);
	const ui = useAgendaUI();

	useEffect(() => {
		if (!ui.formDialogOpen) ui.openingForEditRef.current = false;
	}, [ui.formDialogOpen, ui.openingForEditRef]);

	const events = useMemo(
		() => buildCalendarEvents(agendaData.getEnrichedEvents(ui.currentDate, effectiveUserId), ui.optimisticMove),
		[agendaData.getEnrichedEvents, ui.currentDate, effectiveUserId, ui.optimisticMove],
	);

	const scrollToTime = useMemo(() => resolveAgendaScrollToTime(events), [events]);

	const derived = useMemo(
		() =>
			buildAgendaViewDerivedState({
				ui,
				deviationsByEventId: agendaData.deviationsByEventId,
				agreementsMap: agendaData.agreementsMap,
				effectiveUserId,
				isPrivileged,
			}),
		[ui, agendaData.deviationsByEventId, agendaData.agreementsMap, effectiveUserId, isPrivileged],
	);

	const handlers = useAgendaViewHandlers({
		ui,
		canEdit,
		user,
		agendaEvents: agendaData.agendaEvents,
		deviations: agendaData.deviations,
		agreementsMap: agendaData.agreementsMap,
		loadData: agendaData.loadData,
	});

	const calendarProps = getCalendarProps({
		events,
		currentView: ui.currentView,
		currentDate: ui.currentDate,
		canEdit,
		isOwnAgenda: canManageAgenda,
		scrollToTime,
		onEventDrop: handlers.handleEventDrop,
		onSelectEvent: handlers.handleSelectEvent,
		onSelectSlot: handlers.handleSelectSlot,
		setCurrentView: ui.setCurrentView,
		setCurrentDate: ui.setCurrentDate,
		noLessonPeriods: agendaData.noLessonPeriods,
	});

	return { ui, derived, handlers, calendarProps, loading: agendaData.loading };
}
