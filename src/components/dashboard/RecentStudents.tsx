import { useNavigate } from 'react-router-dom';
import { DashboardListCardSkeleton } from '@/components/dashboard/DashboardListCardSkeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NAV_ICONS, NAV_LABELS } from '@/config/nav-labels';
import type { DashboardStudent } from '@/hooks/useDashboardData';
import { formatDateTimeShort } from '@/lib/date/date-format';

const StudentsIcon = NAV_ICONS.students;

interface RecentStudentsProps {
	students: DashboardStudent[];
	isLoading?: boolean;
	title?: string;
}

function getStatusBadge(status: string) {
	switch (status) {
		case 'active':
			return <Badge variant="default">Actief</Badge>;
		case 'trial':
			return <Badge variant="secondary">Proefles</Badge>;
		case 'inactive':
			return <Badge variant="outline">Inactief</Badge>;
		default:
			return null;
	}
}

export function RecentStudents({
	students,
	isLoading = false,
	title = `Recente ${NAV_LABELS.students.toLowerCase()}`,
}: RecentStudentsProps) {
	const navigate = useNavigate();

	if (isLoading) {
		return (
			<DashboardListCardSkeleton
				icon={<StudentsIcon className="h-5 w-5 text-primary" />}
				titleWidthClass="w-32"
				itemKeyPrefix="student-skeleton"
			/>
		);
	}

	return (
		<Card>
			<CardHeader className="pb-2">
				<div className="flex items-center gap-2">
					<StudentsIcon className="h-5 w-5 text-primary" />
					<CardTitle className="text-base font-semibold">{title}</CardTitle>
				</div>
			</CardHeader>
			<CardContent>
				{students.length === 0 ? (
					<p className="text-sm text-muted-foreground">Geen {NAV_LABELS.students.toLowerCase()} gevonden.</p>
				) : (
					<div className="space-y-1">
						{students.map((student) => (
							<button
								key={student.user_id}
								type="button"
								className="w-full flex items-center justify-between rounded-lg p-2 hover:bg-muted/50 cursor-pointer transition-colors text-left"
								onClick={() => navigate(`/students/${student.user_id}`)}
							>
								<div className="flex items-center gap-3">
									<Avatar className="h-9 w-9">
										<AvatarFallback className="bg-muted text-muted-foreground text-xs">
											{student.display_name.slice(0, 2).toUpperCase()}
										</AvatarFallback>
									</Avatar>
									<div>
										<p className="text-sm font-medium leading-tight">{student.display_name}</p>
										<p className="text-xs text-muted-foreground">{student.email}</p>
									</div>
								</div>
								<div className="flex items-center gap-2">
									{getStatusBadge(student.status)}
									<span className="text-xs text-muted-foreground hidden sm:inline">
										{student.created_at ? formatDateTimeShort(new Date(student.created_at)) : ''}
									</span>
								</div>
							</button>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
