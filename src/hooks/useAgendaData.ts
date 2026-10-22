import { useCallback, useEffect, useState } from 'react';
import { useAppSettingsContext } from '@/components/AppSettingsProvider';
import type { CalendarEvent } from '@/components/agenda/types';
import type { LessonGroupInfo } from '@/lib/agenda/enrichAgendaEvent';
import {
	type AgendaDataState,
	buildAgendaDeviationIndexes,
	buildEnrichedAgendaEvents,
	createEmptyAgendaDataState,
	fetchAgendaDataState,
} from '@/lib/agenda/useAgendaDataHelpers';
import type { AgendaEventDeviationRow, AgendaEventRow } from '@/types/agenda-events';
import type { AgendaLessonAgreement } from '@/types/lesson-agreements';
import type { ProjectInfo } from '@/types/projects';

export type { LessonGroupInfo } from '@/lib/agenda/enrichAgendaEvent';

export interface UseAgendaDataResult {
	agendaEvents: AgendaEventRow[];
	deviations: AgendaEventDeviationRow[];
	deviationsByEventId: Map<string, Map<string, AgendaEventDeviationRow>>;
	recurringByEventId: Map<string, AgendaEventDeviationRow[]>;
	agreementsMap: Map<string, AgendaLessonAgreement>;
	participantCountByEventId: Map<string, number>;
	participantNamesByEventId: Map<string, string[]>;
	projectsMap: Map<string, ProjectInfo>;
	lessonGroupsMap: Map<string, LessonGroupInfo>;
	noLessonPeriods: AgendaDataState['noLessonPeriods'];
	loading: boolean;
	loadData: (showLoading?: boolean) => Promise<void>;
	getEnrichedEvents: (currentDate: Date, effectiveUserId: string | undefined) => CalendarEvent[];
}

function applyAgendaDataState(setState: (state: AgendaDataState) => void, next: AgendaDataState | 'empty'): void {
	if (next === 'empty') {
		setState(createEmptyAgendaDataState());
		return;
	}
	setState(next);
}

export function useAgendaData(effectiveUserId: string | undefined): UseAgendaDataResult {
	const { settings } = useAppSettingsContext();
	const [state, setState] = useState<AgendaDataState>(createEmptyAgendaDataState);
	const [loading, setLoading] = useState(true);

	const loadData = useCallback(
		async (showLoading = true) => {
			if (!effectiveUserId) return;
			if (showLoading) setLoading(true);

			const nextState = await fetchAgendaDataState(effectiveUserId);
			applyAgendaDataState(setState, nextState);
			setLoading(false);
		},
		[effectiveUserId],
	);

	useEffect(() => {
		loadData();
	}, [loadData]);

	const { deviationsByEventId, recurringByEventId } = buildAgendaDeviationIndexes(state.deviations);
	const agreementsMap = new Map<string, AgendaLessonAgreement>(state.agreements.map((a) => [a.id, a]));

	const getEnrichedEvents = useCallback(
		(currentDate: Date, viewerUserId: string | undefined): CalendarEvent[] =>
			buildEnrichedAgendaEvents(state, currentDate, viewerUserId, settings.school_year),
		[state, settings.school_year],
	);

	return {
		agendaEvents: state.agendaEvents,
		deviations: state.deviations,
		deviationsByEventId,
		recurringByEventId,
		agreementsMap,
		participantCountByEventId: state.participantCountByEventId,
		participantNamesByEventId: state.participantNamesByEventId,
		projectsMap: state.projectsMap,
		lessonGroupsMap: state.lessonGroupsMap,
		noLessonPeriods: state.noLessonPeriods,
		loading,
		loadData,
		getEnrichedEvents,
	};
}
