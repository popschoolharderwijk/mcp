import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	shouldLoadLessonGroupEditData,
	shouldLoadLessonGroupTeacherSlots,
} from '@/components/lesson-groups/wizard/lessonGroupDataHooksHelpers';
import {
	fetchEligibleStudentIds,
	fetchGroupLessonTypes,
	fetchLessonGroupForEdit,
	fetchLessonGroupTeacherSlots,
	fetchLessonGroupTeachers,
	fetchPendingSignupRequests,
} from '@/components/lesson-groups/wizard/lessonGroupDataLoadHelpers';
import type {
	LessonTypeOpt,
	LGStep,
	PendingSignupRequest,
	TeacherOpt,
} from '@/components/lesson-groups/wizard/lessonGroupWizardTypes';
import type { SlotWithStatus } from '@/lib/agreementSlots';
import type { LessonFrequency } from '@/types/lesson-agreements';

export function useLessonGroupTypes() {
	const [lessonTypes, setLessonTypes] = useState<LessonTypeOpt[]>([]);

	useEffect(() => {
		void fetchGroupLessonTypes().then(setLessonTypes);
	}, []);

	return lessonTypes;
}

export function useLessonGroupEditLoad(id: string | undefined, isEditMode: boolean, defaultEndDate: string) {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(isEditMode);
	const [initial, setInitial] = useState<{
		name: string;
		lessonTypeId: string;
		durationMinutes: number;
		frequency: LessonFrequency;
		startDate: string;
		endDate: string;
		teacherUserId: string;
		slot: SlotWithStatus;
		memberIds: string[];
	} | null>(null);

	useEffect(() => {
		if (!shouldLoadLessonGroupEditData(isEditMode, id)) {
			setLoading(false);
			return;
		}
		void fetchLessonGroupForEdit(id, defaultEndDate, navigate).then((result) => {
			if (result) setInitial(result);
			setLoading(false);
		});
	}, [id, isEditMode, navigate, defaultEndDate]);

	return { loading, initial };
}

export function useLessonGroupTeachers(lessonTypeId: string | null) {
	const [teachers, setTeachers] = useState<TeacherOpt[]>([]);

	useEffect(() => {
		if (!lessonTypeId) {
			setTeachers([]);
			return;
		}
		void fetchLessonGroupTeachers(lessonTypeId).then(setTeachers);
	}, [lessonTypeId]);

	return teachers;
}

export function useEligibleStudents(lessonTypeId: string | null) {
	const [eligibleStudentIds, setEligibleStudentIds] = useState<string[]>([]);

	useEffect(() => {
		if (!lessonTypeId) {
			setEligibleStudentIds([]);
			return;
		}
		void fetchEligibleStudentIds(lessonTypeId).then(setEligibleStudentIds);
	}, [lessonTypeId]);

	return eligibleStudentIds;
}

export function usePendingSignupRequests(lessonTypeId: string | null) {
	const [pendingRequests, setPendingRequests] = useState<PendingSignupRequest[]>([]);

	useEffect(() => {
		if (!lessonTypeId) {
			setPendingRequests([]);
			return;
		}
		void fetchPendingSignupRequests(lessonTypeId).then(setPendingRequests);
	}, [lessonTypeId]);

	return pendingRequests;
}

interface TeacherSlotsParams {
	step: LGStep;
	teacherUserId: string | null;
	startDate: string;
	endDate: string;
	durationMinutes: number;
	frequency: LessonFrequency;
	isEditMode: boolean;
	groupId: string | undefined;
}

export function useLessonGroupTeacherSlots(params: TeacherSlotsParams) {
	const [slots, setSlots] = useState<SlotWithStatus[]>([]);
	const [loadingSlots, setLoadingSlots] = useState(false);
	const { step, teacherUserId, startDate, endDate, durationMinutes, frequency, isEditMode, groupId } = params;

	useEffect(() => {
		if (!shouldLoadLessonGroupTeacherSlots({ step, teacherUserId, startDate, endDate })) {
			setSlots([]);
			return;
		}
		let active = true;
		setLoadingSlots(true);
		void fetchLessonGroupTeacherSlots({
			teacherUserId: teacherUserId as string,
			startDate,
			endDate,
			durationMinutes,
			frequency,
			isEditMode,
			groupId,
		}).then((statuses) => {
			if (!active) return;
			setSlots(statuses);
			setLoadingSlots(false);
		});
		return () => {
			active = false;
		};
	}, [step, teacherUserId, startDate, endDate, durationMinutes, frequency, groupId, isEditMode]);

	return { slots, loadingSlots };
}
