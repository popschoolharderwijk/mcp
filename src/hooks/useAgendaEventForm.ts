import { useCallback, useMemo, useState } from 'react';
import type { RecurrenceScope } from '@/components/agenda/RecurrenceChoiceDialog';
import { useAgendaEventFormInit } from '@/hooks/useAgendaEventFormInit';
import { useAgendaEventParticipantState } from '@/hooks/useAgendaEventParticipantState';
import {
	buildInitialFormSnapshot,
	hasAgendaFormChanges,
	type OccurrenceOverrides,
} from '@/lib/agenda/agendaEventFormHelpers';
import { runPerformAgendaEventSave } from '@/lib/agenda/agendaEventFormPerformSaveHelpers';
import type { AgendaEventRow, AgendaEventSourceType } from '@/types/agenda-events';

export type { OccurrenceOverrides };

export interface UseAgendaEventFormOptions {
	open: boolean;
	event: AgendaEventRow | null | undefined;
	initialSlot: { start: Date; end: Date } | null | undefined;
	userId: string | undefined;
	occurrenceDate?: string | null;
	occurrenceStartTime?: string | null;
	occurrenceEndTime?: string | null;
	occurrenceParticipantIds?: string[] | null;
	occurrenceParticipantProfiles?: Record<
		string,
		{ first_name: string | null; last_name: string | null; email: string | null }
	> | null;
	occurrenceOverrides?: OccurrenceOverrides | null;
	readonlyParticipantIds?: string[];
	sourceType?: AgendaEventSourceType;
	sourceId?: string | null;
	onSuccess?: () => void;
	onOpenChange: (open: boolean) => void;
}

export function useAgendaEventForm(options: UseAgendaEventFormOptions) {
	const {
		open,
		event,
		initialSlot,
		userId,
		occurrenceDate,
		occurrenceStartTime,
		occurrenceEndTime,
		occurrenceParticipantIds,
		occurrenceParticipantProfiles,
		occurrenceOverrides,
		readonlyParticipantIds = [],
		sourceType: externalSourceType,
		sourceId: externalSourceId,
		onSuccess,
		onOpenChange,
	} = options;

	const [saving, setSaving] = useState(false);
	const {
		participantIds,
		setParticipantIds,
		initialParticipantIds,
		setInitialParticipantIds,
		participantAddId,
		setParticipantAddId,
		participantProfiles,
	} = useAgendaEventParticipantState(open, event?.id, occurrenceParticipantIds, occurrenceParticipantProfiles);

	const formFields = useAgendaEventFormInit({
		open,
		event,
		initialSlot,
		userId,
		occurrenceDate,
		occurrenceStartTime,
		occurrenceEndTime,
		occurrenceOverrides,
		setParticipantIds,
		setInitialParticipantIds,
	});

	const handleAddParticipant = useCallback(
		(newUserId: string | null) => {
			if (!newUserId || participantIds.includes(newUserId)) return;
			setParticipantIds((prev) => [...prev, newUserId]);
			setParticipantAddId(null);
		},
		[participantIds, setParticipantIds, setParticipantAddId],
	);

	const handleRemoveParticipant = useCallback(
		(removeUserId: string) => {
			if (readonlyParticipantIds.includes(removeUserId)) return;
			setParticipantIds((prev) => prev.filter((id) => id !== removeUserId));
		},
		[readonlyParticipantIds, setParticipantIds],
	);

	const initialSnapshot = useMemo(() => {
		if (!event) return null;
		return buildInitialFormSnapshot(
			event,
			occurrenceDate,
			occurrenceStartTime,
			occurrenceEndTime,
			occurrenceOverrides,
			initialParticipantIds,
		);
	}, [event, occurrenceDate, occurrenceStartTime, occurrenceEndTime, occurrenceOverrides, initialParticipantIds]);

	const hasChanges = hasAgendaFormChanges(initialSnapshot, {
		title: formFields.title,
		description: formFields.description,
		startDate: formFields.startDate,
		startTime: formFields.startTime,
		endDate: formFields.endDate,
		endTime: formFields.endTime,
		isAllDay: formFields.isAllDay,
		recurring: formFields.recurring,
		recurringFrequency: formFields.recurringFrequency,
		recurringEndDate: formFields.recurringEndDate,
		color: formFields.color,
		participantIds,
	});

	const performSave = useCallback(
		(scope: RecurrenceScope = 'all') =>
			runPerformAgendaEventSave({
				scope,
				userId,
				formFields,
				participantIds,
				initialParticipantIds,
				event,
				occurrenceDate,
				occurrenceStartTime,
				externalSourceType,
				externalSourceId,
				setSaving,
				onSuccess,
				onOpenChange,
			}),
		[
			userId,
			formFields,
			participantIds,
			initialParticipantIds,
			event,
			occurrenceDate,
			occurrenceStartTime,
			onSuccess,
			onOpenChange,
			externalSourceType,
			externalSourceId,
		],
	);

	return {
		formState: {
			...formFields,
			participantIds,
			participantAddId,
			setParticipantAddId,
			participantProfiles,
		},
		handlers: {
			handleAddParticipant,
			handleRemoveParticipant,
			performSave,
		},
		saving,
		hasChanges,
	};
}
