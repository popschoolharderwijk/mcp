import type { Dispatch, SetStateAction } from 'react';
import type { LessonGroupFormState } from '@/components/lesson-groups/wizard/lessonGroupWizardTypes';
import type { LessonFrequency } from '@/types/lesson-agreements';

export type LessonGroupFormUpdaters = {
	setName: (name: string) => void;
	setLessonTypeId: (lessonTypeId: string | null) => void;
	setDurationMinutes: (durationMinutes: number) => void;
	setFrequency: (frequency: LessonFrequency) => void;
	setStartDate: (startDate: string | null) => void;
	setEndDate: (endDate: string | null) => void;
	setTeacherUserId: (teacherUserId: string | null) => void;
	setMemberIds: (memberIds: string[]) => void;
	setSelectedRequestIds: (selectedRequestIds: string[]) => void;
	setScheduleInAgenda: (scheduleInAgenda: boolean) => void;
};

export function createLessonGroupFormUpdaters(
	setForm: Dispatch<SetStateAction<LessonGroupFormState>>,
): LessonGroupFormUpdaters {
	return {
		setName: (name) => setForm((f) => ({ ...f, name })),
		setLessonTypeId: (lessonTypeId) =>
			setForm((f) => ({ ...f, lessonTypeId, teacherUserId: null, slot: null, selectedRequestIds: [] })),
		setDurationMinutes: (durationMinutes) => setForm((f) => ({ ...f, durationMinutes, slot: null })),
		setFrequency: (frequency) => setForm((f) => ({ ...f, frequency, slot: null })),
		setStartDate: (startDate) => setForm((f) => ({ ...f, startDate: startDate ?? '', slot: null })),
		setEndDate: (endDate) => setForm((f) => ({ ...f, endDate: endDate ?? '', slot: null })),
		setTeacherUserId: (teacherUserId) => setForm((f) => ({ ...f, teacherUserId, slot: null })),
		setMemberIds: (memberIds) => setForm((f) => ({ ...f, memberIds })),
		setSelectedRequestIds: (selectedRequestIds) => setForm((f) => ({ ...f, selectedRequestIds })),
		setScheduleInAgenda: (scheduleInAgenda) => setForm((f) => ({ ...f, scheduleInAgenda })),
	};
}
