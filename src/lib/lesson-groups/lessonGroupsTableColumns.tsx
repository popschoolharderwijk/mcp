import { LuCalendarPlus, LuTrash2 } from 'react-icons/lu';
import type { NavigateFunction } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { DataTableColumn } from '@/components/ui/data-table';
import { UserDisplay } from '@/components/ui/user-display';
import { frequencyLabels } from '@/lib/frequencies';
import {
	formatLessonGroupMemberLabel,
	LESSON_GROUP_DAY_LABELS,
	type LessonGroupTableRow,
} from '@/lib/lesson-groups/lessonGroupsPageHelpers';

export function buildLessonGroupColumns(navigate: NavigateFunction): DataTableColumn<LessonGroupTableRow>[] {
	return [
		{
			key: 'name',
			label: 'Naam',
			sortable: true,
			sortValue: (group) => group.name.toLowerCase(),
			render: (group) => <span className="font-medium">{group.name}</span>,
		},
		{
			key: 'lesson_type',
			label: 'Lestype',
			sortable: true,
			sortValue: (group) => group.lesson_type_name.toLowerCase(),
			render: (group) => <span className="text-muted-foreground">{group.lesson_type_name}</span>,
		},
		{
			key: 'teacher',
			label: 'Docent',
			render: (group) => (
				<UserDisplay
					profile={{
						first_name: group.teacher_first_name,
						last_name: group.teacher_last_name,
						email: group.teacher_email,
						avatar_url: group.teacher_avatar_url,
					}}
				/>
			),
		},
		{
			key: 'schedule',
			label: 'Schema',
			render: (group) => (
				<span className="text-muted-foreground">
					{LESSON_GROUP_DAY_LABELS[group.day_of_week]} {group.start_time.slice(0, 5)} ·{' '}
					{frequencyLabels[group.frequency]}
				</span>
			),
		},
		{
			key: 'members',
			label: 'Deelnemers',
			sortable: true,
			sortValue: (group) => group.members.length,
			render: (group) => {
				if (!group.members.length) {
					return <span className="text-muted-foreground">—</span>;
				}
				return (
					<div className="flex flex-wrap gap-1">
						{group.members.map((member) => {
							const label = formatLessonGroupMemberLabel(member);
							return (
								<button
									key={member.user_id}
									type="button"
									onClick={(event) => {
										event.stopPropagation();
										navigate(`/students?search=${encodeURIComponent(label)}`);
									}}
									className="rounded-md bg-muted px-2 py-0.5 text-xs hover:bg-accent hover:underline"
									title="Bekijk leerling"
								>
									{label}
								</button>
							);
						})}
					</div>
				);
			},
		},
		{
			key: 'status',
			label: 'Status',
			sortable: true,
			sortValue: (group) => (group.is_active ? 1 : 0),
			render: (group) => (
				<Badge variant={group.is_active ? 'default' : 'secondary'}>
					{group.is_active ? 'Actief' : 'Inactief'}
				</Badge>
			),
		},
	];
}

interface LessonGroupRowActionsProps {
	group: LessonGroupTableRow;
	onSchedule: (group: LessonGroupTableRow) => void;
	onDelete: (group: LessonGroupTableRow) => void;
}

export function LessonGroupRowActions({ group, onSchedule, onDelete }: LessonGroupRowActionsProps) {
	return (
		<div className="flex items-center gap-1">
			<Button
				type="button"
				size="icon"
				variant="ghost"
				className="h-8 w-8"
				onClick={(event) => {
					event.stopPropagation();
					onSchedule(group);
				}}
				title="Plan in agenda"
			>
				<LuCalendarPlus className="h-4 w-4" />
			</Button>
			<Button
				type="button"
				size="icon"
				variant="ghost"
				className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
				onClick={(event) => {
					event.stopPropagation();
					onDelete(group);
				}}
				title="Verwijderen"
			>
				<LuTrash2 className="h-4 w-4" />
			</Button>
		</div>
	);
}
