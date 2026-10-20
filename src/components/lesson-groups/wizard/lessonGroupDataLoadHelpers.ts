import type { NavigateFunction } from 'react-router-dom';
import { toast } from 'sonner';
import type {
	LessonTypeOpt,
	PendingSignupRequest,
	TeacherOpt,
} from '@/components/lesson-groups/wizard/lessonGroupWizardTypes';
import { supabase } from '@/integrations/supabase/client';
import { getSlotStatuses, type SlotWithStatus } from '@/lib/agreementSlots';
import { buildTeacherOptsFromActives, filterRowsInDateRange } from '@/lib/teachers/teacherOptHelpers';
import type { LessonFrequency } from '@/types/lesson-agreements';

export async function fetchGroupLessonTypes(): Promise<LessonTypeOpt[]> {
	const { data } = await supabase
		.from('lesson_types')
		.select('id, name, icon, color')
		.eq('is_active', true)
		.eq('is_group_lesson', true)
		.order('name');
	return data ?? [];
}

export interface LessonGroupEditInitial {
	name: string;
	lessonTypeId: string;
	durationMinutes: number;
	frequency: LessonFrequency;
	pricePerLesson: number;
	startDate: string;
	endDate: string;
	teacherUserId: string;
	slot: SlotWithStatus;
	memberIds: string[];
}

interface LessonGroupRow {
	name: string;
	lesson_type_id: string;
	duration_minutes: number;
	frequency: string;
	price_per_lesson: number | string | null;
	start_date: string;
	end_date: string | null;
	teacher_user_id: string;
	day_of_week: number;
	start_time: string;
}

function buildLessonGroupEditInitial(
	data: LessonGroupRow,
	members: { student_user_id: string }[],
	defaultEndDate: string,
): LessonGroupEditInitial {
	return {
		name: data.name,
		lessonTypeId: data.lesson_type_id,
		durationMinutes: data.duration_minutes,
		frequency: data.frequency as LessonFrequency,
		pricePerLesson: Number(data.price_per_lesson ?? 0),
		startDate: data.start_date,
		endDate: data.end_date ?? defaultEndDate,
		teacherUserId: data.teacher_user_id,
		slot: {
			day_of_week: data.day_of_week,
			start_time: data.start_time,
			end_time: data.start_time,
			status: 'free',
			occupiedOccurrences: 0,
			totalOccurrences: 0,
		},
		memberIds: members.map((member) => member.student_user_id),
	};
}

export async function fetchLessonGroupForEdit(
	id: string,
	defaultEndDate: string,
	navigate: NavigateFunction,
): Promise<LessonGroupEditInitial | null> {
	const { data, error } = await supabase.from('lesson_groups').select('*').eq('id', id).single();
	if (error || !data) {
		toast.error('Lesgroep niet gevonden');
		navigate('/lesson-groups');
		return null;
	}
	const { data: members } = await supabase
		.from('lesson_group_members')
		.select('student_user_id')
		.eq('lesson_group_id', id)
		.is('left_date', null);
	return buildLessonGroupEditInitial(data, members ?? [], defaultEndDate);
}

export async function fetchLessonGroupTeachers(lessonTypeId: string): Promise<TeacherOpt[]> {
	const { data: tlt } = await supabase
		.from('teacher_lesson_types')
		.select('teacher_user_id')
		.eq('lesson_type_id', lessonTypeId);
	const ids = (tlt ?? []).map((row) => row.teacher_user_id);
	if (!ids.length) return [];

	const [{ data: actives }, { data: profiles }] = await Promise.all([
		supabase.from('teachers').select('user_id').in('user_id', ids).eq('is_active', true),
		supabase.from('profiles').select('user_id, first_name, last_name, email, avatar_url').in('user_id', ids),
	]);
	return buildTeacherOptsFromActives(actives ?? [], profiles ?? []) as TeacherOpt[];
}

export async function fetchEligibleStudentIds(lessonTypeId: string): Promise<string[]> {
	const { data } = await supabase
		.from('lesson_agreements')
		.select('student_user_id')
		.eq('lesson_type_id', lessonTypeId);
	return Array.from(new Set((data ?? []).map((agreement) => agreement.student_user_id)));
}

export async function fetchPendingSignupRequests(lessonTypeId: string): Promise<PendingSignupRequest[]> {
	const { data } = await supabase
		.from('lesson_signup_requests')
		.select('id, first_name, last_name, email')
		.eq('lesson_type_id', lessonTypeId)
		.eq('status', 'pending')
		.order('created_at', { ascending: true });
	return data ?? [];
}

interface ExistingBooking {
	day_of_week: number;
	start_time: string;
	start_date: string;
	end_date: string | null;
	duration_minutes: number;
	frequency: LessonFrequency;
}

function filterBookingsInRange<T extends { start_date: string; end_date: string | null }>(
	rows: T[],
	startDate: string,
	endDate: string,
): T[] {
	return filterRowsInDateRange(rows, startDate, endDate);
}

function mapGroupBookings(
	groups: {
		id: string;
		day_of_week: number;
		start_time: string;
		start_date: string;
		end_date: string | null;
		duration_minutes: number;
		frequency: string;
	}[],
	startDate: string,
	endDate: string,
	isEditMode: boolean,
	groupId: string | undefined,
): ExistingBooking[] {
	const inRange = filterBookingsInRange(groups, startDate, endDate);
	const mapped: ExistingBooking[] = [];
	for (const group of inRange) {
		if (isEditMode && group.id === groupId) continue;
		mapped.push({
			day_of_week: group.day_of_week,
			start_time: group.start_time,
			start_date: group.start_date,
			end_date: group.end_date,
			duration_minutes: group.duration_minutes,
			frequency: group.frequency as LessonFrequency,
		});
	}
	return mapped;
}

export interface FetchTeacherSlotsParams {
	teacherUserId: string;
	startDate: string;
	endDate: string;
	durationMinutes: number;
	frequency: LessonFrequency;
	isEditMode: boolean;
	groupId: string | undefined;
}

export async function fetchLessonGroupTeacherSlots(params: FetchTeacherSlotsParams): Promise<SlotWithStatus[]> {
	const [avail, agreements, groups] = await Promise.all([
		supabase
			.from('teacher_availability')
			.select('day_of_week, start_time, end_time')
			.eq('teacher_user_id', params.teacherUserId),
		supabase
			.from('lesson_agreements')
			.select('day_of_week, start_time, start_date, end_date, duration_minutes, frequency')
			.eq('teacher_user_id', params.teacherUserId)
			.lte('start_date', params.endDate),
		supabase
			.from('lesson_groups')
			.select('id, day_of_week, start_time, start_date, end_date, duration_minutes, frequency')
			.eq('teacher_user_id', params.teacherUserId)
			.lte('start_date', params.endDate),
	]);

	const agreementBookings = filterBookingsInRange(agreements.data ?? [], params.startDate, params.endDate).map(
		(agreement) => ({
			day_of_week: agreement.day_of_week,
			start_time: agreement.start_time,
			start_date: agreement.start_date,
			end_date: agreement.end_date,
			duration_minutes: agreement.duration_minutes,
			frequency: agreement.frequency as LessonFrequency,
		}),
	);
	const groupBookings = mapGroupBookings(
		groups.data ?? [],
		params.startDate,
		params.endDate,
		params.isEditMode,
		params.groupId,
	);
	const existing = [...agreementBookings, ...groupBookings];

	return getSlotStatuses(
		new Date(params.startDate),
		new Date(params.endDate),
		avail.data ?? [],
		existing,
		params.durationMinutes,
		params.frequency,
	);
}
