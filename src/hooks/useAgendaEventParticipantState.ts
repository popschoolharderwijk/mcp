import { useEffect, useState } from 'react';
import {
	buildParticipantProfileMap,
	extractParticipantUserIds,
	type ParticipantProfile,
	resolveParticipantIdLoadPlan,
	resolveParticipantProfileLoadPlan,
} from '@/components/agenda/agendaEventParticipantStateHelpers';
import { supabase } from '@/integrations/supabase/client';

export function useAgendaEventParticipantState(
	open: boolean,
	eventId: string | undefined,
	occurrenceParticipantIds: string[] | null | undefined,
	occurrenceParticipantProfiles?: Record<string, ParticipantProfile> | null,
) {
	const [participantIds, setParticipantIds] = useState<string[]>([]);
	const [initialParticipantIds, setInitialParticipantIds] = useState<string[]>([]);
	const [participantAddId, setParticipantAddId] = useState<string | null>(null);
	const [participantProfiles, setParticipantProfiles] = useState<Record<string, ParticipantProfile>>({});

	useEffect(() => {
		const plan = resolveParticipantIdLoadPlan({
			open,
			eventId,
			occurrenceParticipantIds,
			occurrenceParticipantProfiles,
		});
		if (plan.type === 'skip') return;
		if (plan.type === 'occurrence') {
			setParticipantIds(plan.participantIds);
			setInitialParticipantIds(plan.participantIds);
			if (plan.profiles) {
				setParticipantProfiles(plan.profiles);
			}
			return;
		}

		void supabase
			.from('agenda_participants')
			.select('user_id')
			.eq('event_id', plan.eventId)
			.then(({ data }) => {
				if (!data) return;
				const ids = extractParticipantUserIds(data);
				setParticipantIds(ids);
				setInitialParticipantIds(ids);
			});
	}, [open, eventId, occurrenceParticipantIds, occurrenceParticipantProfiles]);

	useEffect(() => {
		const plan = resolveParticipantProfileLoadPlan(open, participantIds);
		if (plan.type === 'skip') return;
		if (plan.type === 'clear') {
			setParticipantProfiles({});
			return;
		}

		void supabase
			.from('profiles')
			.select('user_id, first_name, last_name, email')
			.in('user_id', plan.participantIds)
			.then(({ data }) => {
				const fetched = buildParticipantProfileMap(data);
				setParticipantProfiles((current) => ({ ...current, ...fetched }));
			});
	}, [open, participantIds]);

	return {
		participantIds,
		setParticipantIds,
		initialParticipantIds,
		setInitialParticipantIds,
		participantAddId,
		setParticipantAddId,
		participantProfiles,
	};
}
