import type { AgendaEventDeviationRow } from '@/types/agenda-events';
import type { AgendaLessonAgreement } from '@/types/lesson-agreements';
import type { ProjectInfo } from '@/types/projects';
import type { User } from '@/types/users';

export interface LessonGroupInfo {
	id: string;
	name: string;
	lessonTypeName: string | null;
	lessonTypeIcon: string | null;
	lessonTypeColor: string | null;
	memberUserIds: string[];
	/** Combined non-empty notes from active member agreements */
	notes: string | null;
}

export interface EnrichAgendaEventContext {
	participantCountByEventId: Map<string, number>;
	participantNamesByEventId: Map<string, string[]>;
	participantUserIdsByEventId: Map<string, string[]>;
	participantCountByDeviationId: Map<string, number>;
	participantNamesByDeviationId: Map<string, string[]>;
	projectsMap: Map<string, ProjectInfo>;
	lessonGroupsMap: Map<string, LessonGroupInfo>;
	agreementsMap: Map<string, AgendaLessonAgreement>;
	deviationsByEventId: Map<string, Map<string, AgendaEventDeviationRow>>;
	profileMap: Map<string, User>;
	viewerUserId: string | undefined;
}
