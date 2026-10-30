export interface ParticipantProfileRow {
	user_id: string;
	first_name: string | null;
	last_name: string | null;
	email: string | null;
}

export interface ParticipantProfile {
	first_name: string | null;
	last_name: string | null;
	email: string | null;
}

function mapParticipantProfileRow(row: ParticipantProfileRow): [string, ParticipantProfile] {
	return [
		row.user_id,
		{
			first_name: row.first_name ?? null,
			last_name: row.last_name ?? null,
			email: row.email ?? null,
		},
	];
}

export function extractParticipantUserIds(rows: { user_id: string }[]): string[] {
	return rows.map((participant) => participant.user_id);
}

export function buildParticipantProfileMap(
	rows: ParticipantProfileRow[] | null | undefined,
): Record<string, ParticipantProfile> {
	return Object.fromEntries((rows ?? []).map(mapParticipantProfileRow));
}

export function shouldUseOccurrenceParticipantIds(
	participantIds: string[] | null | undefined,
): participantIds is string[] {
	return Boolean(participantIds && participantIds.length > 0);
}

export function shouldClearParticipantProfiles(open: boolean, participantCount: number): boolean {
	return !open || participantCount === 0;
}

export type ParticipantIdLoadPlan =
	| { type: 'skip' }
	| {
			type: 'occurrence';
			participantIds: string[];
			profiles: Record<string, ParticipantProfile> | null;
	  }
	| { type: 'fetch'; eventId: string };

export function resolveParticipantIdLoadPlan(params: {
	open: boolean;
	eventId: string | undefined;
	occurrenceParticipantIds: string[] | null | undefined;
	occurrenceParticipantProfiles?: Record<string, ParticipantProfile> | null;
}): ParticipantIdLoadPlan {
	if (!params.open || !params.eventId) {
		return { type: 'skip' };
	}
	if (shouldUseOccurrenceParticipantIds(params.occurrenceParticipantIds)) {
		return {
			type: 'occurrence',
			participantIds: params.occurrenceParticipantIds,
			profiles: params.occurrenceParticipantProfiles ?? null,
		};
	}
	return { type: 'fetch', eventId: params.eventId };
}

export type ParticipantProfileLoadPlan =
	| { type: 'skip' }
	| { type: 'clear' }
	| { type: 'fetch'; participantIds: string[] };

export function resolveParticipantProfileLoadPlan(open: boolean, participantIds: string[]): ParticipantProfileLoadPlan {
	if (!open) {
		return { type: 'skip' };
	}
	if (shouldClearParticipantProfiles(open, participantIds.length)) {
		return { type: 'clear' };
	}
	return { type: 'fetch', participantIds };
}
