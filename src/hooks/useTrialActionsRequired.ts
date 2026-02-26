import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatDbDateToUi } from '@/lib/date/date-format';
import { formatTime } from '@/lib/time/time-format';

export interface TrialActionItem {
	id: string;
	studentDisplayName: string;
	lessonTypeName: string;
	proposedDate: string | null;
	proposedTime: string | null;
	/** 'student' | 'teacher' = show Bevestigen modal; 'view' = show link to /trial-lessons */
	confirmAction: 'student' | 'teacher' | 'view';
}

export function useTrialActionsRequired() {
	const { user, isAdmin, isSiteAdmin, isStaff, isTeacher, teacherId, isLoading: authLoading } = useAuth();
	const [items, setItems] = useState<TrialActionItem[]>([]);
	const [loading, setLoading] = useState(true);

	const load = useCallback(async () => {
		if (!user || authLoading) return;

		const { data, error } = await supabase
			.from('trial_lesson_requests')
			.select(
				`
				id,
				user_id,
				proposed_teacher_id,
				teacher_confirmed_at,
				student_confirmed_at,
				proposed_start_date,
				proposed_start_time,
				lesson_types ( name )
				`,
			)
			.eq('status', 'proposed')
			.or('teacher_confirmed_at.is.null,student_confirmed_at.is.null')
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Error loading trial actions:', error);
			setItems([]);
			setLoading(false);
			return;
		}

		const raw = (data ?? []) as unknown as Array<{
			id: string;
			user_id: string;
			proposed_teacher_id: string | null;
			teacher_confirmed_at: string | null;
			student_confirmed_at: string | null;
			proposed_start_date: string | null;
			proposed_start_time: string | null;
			lesson_types: { name: string } | { name: string }[] | null;
		}>;

		const userIds = [...new Set(raw.map((r) => r.user_id))];
		const profileMap: Record<string, { first_name: string | null; last_name: string | null }> = {};
		if (userIds.length > 0) {
			const { data: profiles } = await supabase
				.from('profiles')
				.select('user_id, first_name, last_name')
				.in('user_id', userIds);
			for (const p of profiles ?? []) {
				profileMap[p.user_id] = { first_name: p.first_name, last_name: p.last_name };
			}
		}

		const list: TrialActionItem[] = raw.map((r) => {
			const profile = profileMap[r.user_id];
			const name = profile
				? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Onbekend'
				: 'Onbekend';
			const lt = r.lesson_types;
			const lessonName = (Array.isArray(lt) ? lt[0]?.name : lt?.name) ?? '-';
			let confirmAction: 'student' | 'teacher' | 'view' = 'view';
			if (r.user_id === user.id && !r.student_confirmed_at) {
				confirmAction = 'student';
			} else if (isTeacher && r.proposed_teacher_id === teacherId && !r.teacher_confirmed_at) {
				confirmAction = 'teacher';
			} else if (isAdmin || isSiteAdmin || isStaff) {
				confirmAction = 'view';
			}

			return {
				id: r.id,
				studentDisplayName: name,
				lessonTypeName: lessonName,
				proposedDate: r.proposed_start_date ? formatDbDateToUi(r.proposed_start_date) : null,
				proposedTime: r.proposed_start_time ? formatTime(r.proposed_start_time) : null,
				confirmAction,
			};
		});

		setItems(list);
		setLoading(false);
	}, [user, authLoading, isTeacher, teacherId, isAdmin, isSiteAdmin, isStaff]);

	useEffect(() => {
		if (!authLoading && user) load();
	}, [authLoading, user, load]);

	const confirmTrial = useCallback(
		async (trialId: string) => {
			if (!user) return;

			const item = items.find((i) => i.id === trialId);
			if (!item || item.confirmAction === 'view') return;

			if (item.confirmAction === 'student') {
				const { data: row } = await supabase
					.from('trial_lesson_requests')
					.select('teacher_confirmed_at')
					.eq('id', trialId)
					.single();

				const newStatus = row?.teacher_confirmed_at ? 'confirmed' : undefined;
				const { error } = await supabase
					.from('trial_lesson_requests')
					.update({
						student_confirmed_at: new Date().toISOString(),
						...(newStatus && { status: newStatus }),
					})
					.eq('id', trialId);

				if (error) {
					toast.error('Bevestigen mislukt', { description: error.message });
					throw error;
				}
			} else {
				const { data: row } = await supabase
					.from('trial_lesson_requests')
					.select('student_confirmed_at')
					.eq('id', trialId)
					.single();

				const newStatus = row?.student_confirmed_at ? 'confirmed' : undefined;
				const { error } = await supabase
					.from('trial_lesson_requests')
					.update({
						teacher_confirmed_at: new Date().toISOString(),
						...(newStatus && { status: newStatus }),
					})
					.eq('id', trialId);

				if (error) {
					toast.error('Bevestigen mislukt', { description: error.message });
					throw error;
				}
			}

			toast.success('Proefles bevestigd');
			load();
		},
		[user, items, load],
	);

	return { items, loading, confirmTrial };
}
