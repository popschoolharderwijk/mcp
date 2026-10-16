import { useEffect, useState } from 'react';
import {
	buildParticipantProfileMap,
	extractParticipantUserIds,
	shouldClearParticipantProfiles,
	shouldUseOccurrenceParticipantIds,
} from '@/components/agenda/agendaEventParticipantStateHelpers';
import { supabase } from '@/integrations/supabase/client';

interface ParticipantProfile {
	first_name: string | null;
	last_name: string | null;
	email: string | null;
}

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
		if (!open || !eventId) return;
		if (shouldUseOccurrenceParticipantIds(occurrenceParticipantIds)) {
			setParticipantIds(occurrenceParticipantIds);
			setInitialParticipantIds(occurrenceParticipantIds);
			if (occurrenceParticipantProfiles) {
				setParticipantProfiles(occurrenceParticipantProfiles);
			}
			return;
		}

		void supabase
			.from('agenda_participants')
			.select('user_id')
			.eq('event_id', eventId)
			.then(({ data }) => {
				if (!data) return;
				const ids = extractParticipantUserIds(data);
				setParticipantIds(ids);
				setInitialParticipantIds(ids);
			});
	}, [open, eventId, occurrenceParticipantIds, occurrenceParticipantProfiles]);

	useEffect(() => {
		if (shouldClearParticipantProfiles(open, participantIds.length)) {
			setParticipantProfiles({});
			return;
		}

		void supabase
			.from('profiles')
			.select('user_id, first_name, last_name, email')
			.in('user_id', participantIds)
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
