import type { User } from '@supabase/supabase-js';
import { useEffect, useMemo } from 'react';
import { useAppSettingsContext } from '@/components/AppSettingsProvider';
import { buildAgendaViewDerivedState } from '@/components/agenda/agendaViewDerivedState';
import { useAgendaViewHandlers } from '@/components/agenda/useAgendaViewHandlers';
import { useAgendaData } from '@/hooks/useAgendaData';
import { useAgendaUI } from '@/hooks/useAgendaUI';
import {
	collectAgendaLessonTypeFilterOptions,
	filterAgendaEventsByLessonTypeSelection,
	resolveAgendaLessonTypeFilterSelection,
} from '@/lib/agenda/agendaLessonTypeFilterHelpers';
import { buildCalendarEvents } from '@/lib/agenda/buildCalendarEvents';
import { getCalendarProps } from '@/lib/agenda/calendarProps';
import { resolveAgendaTimeGrid } from '@/lib/agenda/resolveAgendaScrollToTime';

interface UseAgendaViewModelParams {
	effectiveUserId: string | undefined;
	canEdit: boolean;
	canManageAgenda: boolean;
	isPrivileged: boolean;
	user: User | null;
}

export function useAgendaViewModel(params: UseAgendaViewModelParams) {
	const { effectiveUserId, canEdit, canManageAgenda, isPrivileged, user } = params;
	const { settings } = useAppSettingsContext();
	const agendaData = useAgendaData(effectiveUserId);
	const ui = useAgendaUI();

	useEffect(() => {
		if (!ui.formDialogOpen) ui.openingForEditRef.current = false;
	}, [ui.formDialogOpen, ui.openingForEditRef]);

	const lessonTypeFilterOptions = useMemo(
		() =>
			collectAgendaLessonTypeFilterOptions(
				agendaData.agreementsMap.values(),
				agendaData.lessonGroupsMap.values(),
			),
		[agendaData.agreementsMap, agendaData.lessonGroupsMap],
	);

	const events = useMemo(
		() =>
			filterAgendaEventsByLessonTypeSelection(
				buildCalendarEvents(agendaData.getEnrichedEvents(ui.currentDate, effectiveUserId), ui.optimisticMove),
				resolveAgendaLessonTypeFilterSelection(ui.lessonTypeFilterSelection, lessonTypeFilterOptions),
			),
		[
			agendaData.getEnrichedEvents,
			ui.currentDate,
			effectiveUserId,
			ui.optimisticMove,
			ui.lessonTypeFilterSelection,
			lessonTypeFilterOptions,
		],
	);

	const timeGrid = useMemo(
		() => resolveAgendaTimeGrid(events, new Date(), settings.agenda),
		[events, settings.agenda],
	);

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
		min: timeGrid.min,
		max: timeGrid.max,
		scrollToTime: timeGrid.scrollToTime,
		step: settings.agenda.slot_minutes,
		onEventDrop: handlers.handleEventDrop,
		onSelectEvent: handlers.handleSelectEvent,
		onSelectSlot: handlers.handleSelectSlot,
		setCurrentView: ui.setCurrentView,
		setCurrentDate: ui.setCurrentDate,
		noLessonPeriods: agendaData.noLessonPeriods,
	});

	return {
		ui,
		derived,
		handlers,
		calendarProps,
		loading: agendaData.loading,
		lessonTypeFilter: {
			options: lessonTypeFilterOptions,
			selection: ui.lessonTypeFilterSelection,
			onSelect: ui.setLessonTypeFilterSelection,
		},
	};
}
