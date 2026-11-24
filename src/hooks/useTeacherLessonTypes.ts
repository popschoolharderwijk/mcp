import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface LessonType {
	id: string;
	name: string;
	icon: string;
	color: string;
}

interface LessonTypeOption {
	id: string;
	name: string;
	icon: string;
	color: string;
}

export function useTeacherLessonTypes(teacherUserId: string, canEdit: boolean) {
	const [lessonTypes, setLessonTypes] = useState<LessonType[]>([]);
	const [allLessonTypes, setAllLessonTypes] = useState<LessonTypeOption[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [addPopoverOpen, setAddPopoverOpen] = useState(false);

	const loadAllLessonTypes = useCallback(async () => {
		const { data, error } = await supabase
			.from('lesson_types')
			.select('id, name, icon, color')
			.eq('is_active', true)
			.order('name', { ascending: true });

		if (error) {
			console.error('Error loading all lesson types:', error);
			return;
		}

		setAllLessonTypes(
			(data ?? []).map((lt) => ({
				id: lt.id,
				name: lt.name,
				icon: lt.icon ?? '',
				color: lt.color ?? '#000000',
			})),
		);
	}, []);

	const loadLessonTypes = useCallback(async () => {
		if (!teacherUserId) return;

		setLoading(true);

		const { data, error } = await supabase
			.from('teacher_lesson_types')
			.select('lesson_type_id, lesson_types(id, name, icon, color)')
			.eq('teacher_user_id', teacherUserId);

		if (error) {
			console.error('Error loading lesson types:', error);
			setLoading(false);
			return;
		}

		const types: LessonType[] =
			data?.map((item) => {
				const lt = item.lesson_types as unknown as {
					id: string;
					name: string;
					icon: string | null;
					color: string | null;
				};
				return {
					id: item.lesson_type_id,
					name: lt.name,
					icon: lt.icon ?? '',
					color: lt.color ?? '#000000',
				};
			}) ?? [];

		setLessonTypes(types);
		setLoading(false);
	}, [teacherUserId]);

	useEffect(() => {
		void loadLessonTypes();
		void loadAllLessonTypes();
	}, [loadLessonTypes, loadAllLessonTypes]);

	const assignedLessonTypeIds = useMemo(() => new Set(lessonTypes.map((lt) => lt.id)), [lessonTypes]);

	const availableLessonTypes = useMemo(
		() => allLessonTypes.filter((lt) => !assignedLessonTypeIds.has(lt.id)),
		[allLessonTypes, assignedLessonTypeIds],
	);

	const handleAddLessonType = useCallback(
		async (lessonTypeId: string) => {
			if (!canEdit) return;

			setSaving(true);
			setAddPopoverOpen(false);

			const { error } = await supabase.from('teacher_lesson_types').insert({
				teacher_user_id: teacherUserId,
				lesson_type_id: lessonTypeId,
			});

			if (error) {
				console.error('Error adding lesson type:', error);
				toast.error('Fout bij toevoegen lessoort');
				setSaving(false);
				return;
			}

			toast.success('Lessoort toegevoegd');
			await loadLessonTypes();
			setSaving(false);
		},
		[canEdit, teacherUserId, loadLessonTypes],
	);

	const handleRemoveLessonType = useCallback(
		async (lessonTypeId: string) => {
			if (!canEdit) return;

			setSaving(true);

			const { error } = await supabase
				.from('teacher_lesson_types')
				.delete()
				.eq('teacher_user_id', teacherUserId)
				.eq('lesson_type_id', lessonTypeId);

			if (error) {
				console.error('Error removing lesson type:', error);
				if (error.message.includes('Cannot remove lesson type from teacher')) {
					toast.error('Kan lessoort niet verwijderen', {
						description: 'Er bestaan nog lesovereenkomsten voor deze docent en lessoort.',
					});
				} else {
					toast.error('Fout bij verwijderen lessoort');
				}
				setSaving(false);
				return;
			}

			toast.success('Lessoort verwijderd');
			await loadLessonTypes();
			setSaving(false);
		},
		[canEdit, teacherUserId, loadLessonTypes],
	);

	return {
		lessonTypes,
		loading,
		saving,
		addPopoverOpen,
		setAddPopoverOpen,
		availableLessonTypes,
		handleAddLessonType,
		handleRemoveLessonType,
	};
}
