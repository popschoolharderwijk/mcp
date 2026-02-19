import { useCallback, useEffect, useState } from 'react';
import { LuLoaderCircle } from 'react-icons/lu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LessonTypeBadge } from '@/components/ui/lesson-type-badge';
import { supabase } from '@/integrations/supabase/client';

interface LessonType {
	id: string;
	name: string;
	icon: string | null;
	color: string | null;
}

interface TeacherLessonTypesSectionProps {
	teacherId: string;
	canEdit: boolean;
}

export function TeacherLessonTypesSection({ teacherId, canEdit: _canEdit }: TeacherLessonTypesSectionProps) {
	const [lessonTypes, setLessonTypes] = useState<LessonType[]>([]);
	const [loading, setLoading] = useState(true);

	const loadLessonTypes = useCallback(async () => {
		if (!teacherId) return;

		setLoading(true);

		const { data, error } = await supabase
			.from('teacher_lesson_types')
			.select('lesson_type_id, lesson_types(id, name, icon, color)')
			.eq('teacher_id', teacherId);

		if (error) {
			console.error('Error loading lesson types:', error);
			setLoading(false);
			return;
		}

		const types: LessonType[] =
			data?.map((item) => ({
				id: item.lesson_type_id,
				name: item.lesson_types.name,
				icon: item.lesson_types.icon,
				color: item.lesson_types.color,
			})) ?? [];

		setLessonTypes(types);
		setLoading(false);
	}, [teacherId]);

	useEffect(() => {
		loadLessonTypes();
	}, [loadLessonTypes]);

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<LuLoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Huidige lessoorten</CardTitle>
			</CardHeader>
			<CardContent>
				{lessonTypes.length === 0 ? (
					<p className="text-sm text-muted-foreground">Geen lessoorten toegewezen</p>
				) : (
					<div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
						{lessonTypes.map((lt) => (
							<div
								key={lt.id}
								className="flex min-w-0 items-center gap-3 overflow-hidden rounded-md border p-3"
							>
								<LessonTypeBadge name={lt.name} icon={lt.icon} color={lt.color} />
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
