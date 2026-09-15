import { useNavigate } from 'react-router-dom';
import { DashboardListCardSkeleton } from '@/components/dashboard/DashboardListCardSkeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NAV_ICONS, NAV_LABELS } from '@/config/nav-labels';
import type { DashboardTeacher } from '@/hooks/useDashboardData';

const TeachersIcon = NAV_ICONS.teachers;

interface TeacherAvailabilityProps {
	teachers: DashboardTeacher[];
	isLoading?: boolean;
}

export function TeacherAvailability({ teachers, isLoading = false }: TeacherAvailabilityProps) {
	const navigate = useNavigate();

	if (isLoading) {
		return (
			<DashboardListCardSkeleton
				icon={<TeachersIcon className="h-5 w-5 text-primary" />}
				titleWidthClass="w-40"
				itemKeyPrefix="teacher-skeleton"
				subtitleWidthClass="w-48"
			/>
		);
	}

	return (
		<Card>
			<CardHeader className="pb-2">
				<div className="flex items-center gap-2">
					<TeachersIcon className="h-5 w-5 text-primary" />
					<CardTitle className="text-base font-semibold">{NAV_LABELS.teachers}</CardTitle>
				</div>
			</CardHeader>
			<CardContent>
				{teachers.length === 0 ? (
					<p className="text-sm text-muted-foreground">Geen {NAV_LABELS.teachers.toLowerCase()} gevonden.</p>
				) : (
					<div className="space-y-1">
						{teachers.map((teacher) => (
							<button
								key={teacher.user_id}
								type="button"
								className="w-full flex items-center justify-between rounded-lg p-2 hover:bg-accent cursor-pointer transition-colors text-left"
								onClick={() => navigate(`/teachers/${teacher.user_id}`)}
							>
								<div className="flex items-center gap-3">
									<Avatar className="h-9 w-9">
										<AvatarFallback className="bg-muted text-muted-foreground text-xs">
											{teacher.display_name.slice(0, 2).toUpperCase()}
										</AvatarFallback>
									</Avatar>
									<div>
										<p className="text-sm font-medium leading-tight">{teacher.display_name}</p>
										<div className="flex flex-wrap gap-1 mt-0.5">
											{teacher.lessonTypeNames.length > 0 ? (
												teacher.lessonTypeNames.map((name) => (
													<Badge
														key={name}
														variant="secondary"
														className="text-[10px] px-1.5 py-0"
													>
														{name}
													</Badge>
												))
											) : (
												<span className="text-xs text-muted-foreground">
													Geen {NAV_LABELS.lessonTypes.toLowerCase()}
												</span>
											)}
										</div>
									</div>
								</div>
								<div className="text-right">
									<span className="text-sm font-medium">{teacher.availableSlotCount}</span>
									<p className="text-[10px] text-muted-foreground">slots</p>
								</div>
							</button>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
