import { LuCalendarClock, LuClipboardCheck, LuMusic2, LuUsers } from 'react-icons/lu';
import type { WizardStepDef } from '@/components/agreements/WizardStepIndicator';
import type { SlotWithStatus } from '@/lib/agreementSlots';
import type { LessonFrequency } from '@/types/lesson-agreements';

export enum LGStep {
	Basics = 'basics',
	Teacher = 'teacher',
	Members = 'members',
	Confirm = 'confirm',
}

export const LG_STEP_ORDER: LGStep[] = [LGStep.Basics, LGStep.Teacher, LGStep.Members, LGStep.Confirm];

export const LG_STEPS: WizardStepDef<LGStep>[] = [
	{ key: LGStep.Basics, label: 'Groep & lessoort', icon: LuMusic2 },
	{ key: LGStep.Teacher, label: 'Docent & tijdslot', icon: LuCalendarClock },
	{ key: LGStep.Members, label: 'Leerlingen', icon: LuUsers },
	{ key: LGStep.Confirm, label: 'Overzicht', icon: LuClipboardCheck },
];

export interface LessonTypeOpt {
	id: string;
	name: string;
	icon: string;
	color: string;
}

export interface TeacherOpt {
	id: string;
	userId: string;
	firstName: string | null;
	lastName: string | null;
	email: string | null;
	avatarUrl: string | null;
}

export interface PendingSignupRequest {
	id: string;
	first_name: string;
	last_name: string;
	email: string;
}

export interface LessonGroupFormState {
	name: string;
	lessonTypeId: string | null;
	durationMinutes: number;
	frequency: LessonFrequency;
	startDate: string;
	endDate: string;
	teacherUserId: string | null;
	slot: SlotWithStatus | null;
	memberIds: string[];
	selectedRequestIds: string[];
	scheduleInAgenda: boolean;
}
