import type { Event } from 'react-big-calendar';
import type { AgendaEventSourceType, CancellationType } from '@/types/agenda-events';
import type { User } from '@/types/users';

export interface CalendarEventResource {
	type: 'agreement' | 'deviation' | 'agenda';
	agreementId: string;
	/** Agenda event id (for lesson appointments and manual events); used for RPCs and deviations */
	eventId?: string;
	deviationId?: string;
	studentName: string;
	user?: User;
	users?: User[];
	lessonTypeName: string;
	lessonTypeColor: string | null;
	lessonTypeIcon: string | null;
	isDeviation: boolean;
	/** True when deviation changed date/time (not only title/description/color/participants). Used for "Gewijzigde afspraak" icon and banner. */
	hasTimeOrDateChange?: boolean;
	isCancelled: boolean;
	isGroupLesson: boolean;
	/** True when this lesson_agreement event is part of a duo (two students share one event) */
	isDuoLesson?: boolean;
	studentCount?: number;
	originalDate?: string;
	originalStartTime?: string;
	reason?: string | null;
	isPending?: boolean;
	isRecurring?: boolean;
	/** Participant user ids (for agenda events) */
	participants?: string[];
	participantCount?: number;
	/** Participant display names for tooltip (when multiple participants) */
	participantNames?: string[];
	/** When type is agenda: manual events can be edited/deleted; lesson_agreement cannot */
	sourceType?: AgendaEventSourceType;
	/** Custom color for the event (hex) */
	color?: string | null;
	/** True when this event is linked to a lesson_agreement */
	isLesson?: boolean;
	/** Teacher name for lesson events (used in tooltip for student view) */
	teacherName?: string;
	/** Teacher user id for lesson events */
	teacherUserId?: string;
	/** True when the viewer is the teacher of this lesson */
	viewerIsTeacher?: boolean;
	/** Project ID when source_type is 'project' */
	projectId?: string;
	/** Project name when source_type is 'project' */
	projectName?: string;
	/** Lesson group id when source_type is 'lesson_group' */
	lessonGroupId?: string;
	/** Lesson group name when source_type is 'lesson_group' */
	lessonGroupName?: string;
	/** Who cancelled: student or teacher */
	cancellationType?: CancellationType;
	/** True when teacher cancelled and lesson needs rescheduling */
	needsReschedule?: boolean;
	/** For group lessons: ids of participants whose attendance is cancelled for this occurrence */
	cancelledParticipantIds?: string[];
	/**
	 * When multiple lesson_agreement events share one calendar slot, members keep their own
	 * event/deviation identity so Terugzetten can restore each original lesson.
	 */
	mergedSlotMembers?: MergedSlotMember[];
	/** True when this card is a same-slot merge of separate lesson_agreement events */
	isSameSlotMerge?: boolean;
	/** Agreement notes (e.g. imported agreementnumber); omitted from tooltip when null/empty */
	notes?: string | null;
}

export interface MergedSlotMember {
	eventId: string;
	originalDate?: string;
	deviationId?: string;
	hasTimeOrDateChange?: boolean;
	isDeviation?: boolean;
	isCancelled?: boolean;
}

export interface CalendarEvent extends Event {
	resource: CalendarEventResource;
}
