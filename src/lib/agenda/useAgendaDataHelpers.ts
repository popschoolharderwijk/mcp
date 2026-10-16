import { toast } from 'sonner';
import type { CalendarEvent } from '@/components/agenda/types';
import { buildDeviationsByEventId, buildRecurringByEventId } from '@/lib/agenda/agendaDataIndexes';
import { enrichAgendaEvent, type LessonGroupInfo } from '@/lib/agenda/enrichAgendaEvent';
import { generateAgendaEvents, type NoLessonPeriod } from '@/lib/agenda/eventGenerators';
import {
	buildAgendaAgreementsWithProfiles,
	buildDeviationParticipantMaps,
	buildEventParticipantMaps,
	buildParticipantNamesByEventId,
	collectAgendaProfileUserIds,
	extractAgendaEventSourceIds,
	fetchAgendaCoreData,
	fetchAgendaProfiles,
	fetchAgendaRelatedData,
	fetchNoLessonPeriods,
	fetchUserParticipantEventIds,
} from '@/lib/agenda/loadAgendaData';
import { mergeSameSlotLessonEvents } from '@/lib/agenda/mergeSameSlotLessonEvents';
import type { AgendaEventDeviationRow, AgendaEventRow } from '@/types/agenda-events';
import type { AgendaLessonAgreement } from '@/types/lesson-agreements';
import type { ProjectInfo } from '@/types/projects';
import type { User } from '@/types/users';

export interface AgendaDataState {
	agendaEvents: AgendaEventRow[];
	deviations: AgendaEventDeviationRow[];
	participantCountByEventId: Map<string, number>;
	participantNamesByEventId: Map<string, string[]>;
	participantUserIdsByEventId: Map<string, string[]>;
	participantCountByDeviationId: Map<string, number>;
	participantNamesByDeviationId: Map<string, string[]>;
	agreements: AgendaLessonAgreement[];
	projectsMap: Map<string, ProjectInfo>;
	lessonGroupsMap: Map<string, LessonGroupInfo>;
	profileMap: Map<string, User>;
	noLessonPeriods: NoLessonPeriod[];
}

export function createEmptyAgendaDataState(): AgendaDataState {
	return {
		agendaEvents: [],
		deviations: [],
		participantCountByEventId: new Map(),
		participantNamesByEventId: new Map(),
		participantUserIdsByEventId: new Map(),
		participantCountByDeviationId: new Map(),
		participantNamesByDeviationId: new Map(),
		agreements: [],
		projectsMap: new Map(),
		lessonGroupsMap: new Map(),
		profileMap: new Map(),
		noLessonPeriods: [],
	};
}

export async function fetchAgendaDataState(effectiveUserId: string): Promise<AgendaDataState | 'empty'> {
	const noLessonPeriods = await fetchNoLessonPeriods();
	const participantResult = await fetchUserParticipantEventIds(effectiveUserId);
	if (participantResult.status !== 'ok') {
		return 'empty';
	}

	const coreResult = await fetchAgendaCoreData(participantResult.eventIds);
	if (coreResult.status === 'events_error') {
		toast.error('Failed to load agenda events');
		return createEmptyAgendaDataState();
	}
	if (coreResult.status === 'deviations_error') {
		toast.error('Failed to load deviations');
		return createEmptyAgendaDataState();
	}

	const { events, deviations, participants } = coreResult.data;
	const eventParticipantMaps = buildEventParticipantMaps(participants);
	const relatedData = await fetchAgendaRelatedData(extractAgendaEventSourceIds(events));
	const profileUserIds = collectAgendaProfileUserIds({
		participants,
		deviations,
		agreements: relatedData.agreements,
		agreementsError: relatedData.agreementsError,
		lessonGroupsMap: relatedData.lessonGroupsMap,
	});
	const profileMap = await fetchAgendaProfiles(profileUserIds);
	const participantNamesByEventId = buildParticipantNamesByEventId(profileMap, eventParticipantMaps.userIdsByEventId);
	const deviationParticipantMaps = buildDeviationParticipantMaps(deviations, profileMap);

	return {
		agendaEvents: events,
		deviations,
		participantCountByEventId: eventParticipantMaps.countByEventId,
		participantNamesByEventId,
		participantUserIdsByEventId: eventParticipantMaps.userIdsByEventId,
		participantCountByDeviationId: deviationParticipantMaps.countByDeviationId,
		participantNamesByDeviationId: deviationParticipantMaps.namesByDeviationId,
		agreements: buildAgendaAgreementsWithProfiles(relatedData.agreements, relatedData.agreementsError, profileMap),
		projectsMap: relatedData.projectsMap,
		lessonGroupsMap: relatedData.lessonGroupsMap,
		profileMap,
		noLessonPeriods,
	};
}

export function buildEnrichedAgendaEvents(
	state: AgendaDataState,
	currentDate: Date,
	viewerUserId: string | undefined,
): CalendarEvent[] {
	const deviationsByEventId = buildDeviationsByEventId(state.deviations);
	const recurringByEventId = buildRecurringByEventId(state.deviations);
	const agreementsMap = new Map<string, AgendaLessonAgreement>(state.agreements.map((a) => [a.id, a]));

	const startDate = new Date(currentDate);
	startDate.setMonth(startDate.getMonth() - 1);
	const endDate = new Date(currentDate);
	endDate.setMonth(endDate.getMonth() + 2);

	const baseEvents = generateAgendaEvents(
		state.agendaEvents,
		startDate,
		endDate,
		deviationsByEventId,
		recurringByEventId,
		agreementsMap,
		state.noLessonPeriods,
	);

	const enriched = baseEvents.map((ev) =>
		enrichAgendaEvent(ev, {
			participantCountByEventId: state.participantCountByEventId,
			participantNamesByEventId: state.participantNamesByEventId,
			participantUserIdsByEventId: state.participantUserIdsByEventId,
			participantCountByDeviationId: state.participantCountByDeviationId,
			participantNamesByDeviationId: state.participantNamesByDeviationId,
			projectsMap: state.projectsMap,
			lessonGroupsMap: state.lessonGroupsMap,
			agreementsMap,
			deviationsByEventId,
			profileMap: state.profileMap,
			viewerUserId,
		}),
	);

	return mergeSameSlotLessonEvents(enriched);
}

export function buildAgendaDeviationIndexes(deviations: AgendaEventDeviationRow[]) {
	return {
		deviationsByEventId: buildDeviationsByEventId(deviations),
		recurringByEventId: buildRecurringByEventId(deviations),
	};
}
