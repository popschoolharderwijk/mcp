import { Link, useNavigate } from 'react-router-dom';
import { LuGraduationCap } from 'react-icons/lu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardTeacher } from '@/hooks/useDashboardData';

interface TeacherAvailabilityProps {
	teachers: DashboardTeacher[];
	isLoading?: boolean;
}

export function TeacherAvailability({ teachers, isLoading = false }: TeacherAvailabilityProps) {
	const navigate = useNavigate();

	if (isLoading) {
		return (
			<Card>
				<CardHeader className="flex flex-row items-center justify-between pb-2">
					<div className="flex items-center gap-2">
						<LuGraduationCap className="h-5 w-5 text-primary" />
						<Skeleton className="h-5 w-40" />
					</div>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{[1, 2, 3].map((n) => (
							<div key={`teacher-skeleton-${n}`} className="flex items-center gap-4">
								<Skeleton className="h-10 w-10 rounded-full" />
								<div className="flex-1 space-y-1">
									<Skeleton className="h-4 w-32" />
									<Skeleton className="h-3 w-48" />
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<div className="flex items-center gap-2">
					<LuGraduationCap className="h-5 w-5 text-primary" />
					<CardTitle className="text-base font-semibold">Docenten</CardTitle>
				</div>
				<Button variant="ghost" size="sm" asChild>
					<Link to="/teachers">Alle docenten</Link>
				</Button>
			</CardHeader>
			<CardContent>
				{teachers.length === 0 ? (
					<p className="text-sm text-muted-foreground">Geen docenten gevonden.</p>
				) : (
					<div className="space-y-3">
						{teachers.map((teacher) => (
							<div
								key={teacher.user_id}
								className="flex items-center justify-between rounded-lg p-2 hover:bg-muted/50 cursor-pointer transition-colors"
								onClick={() => navigate(`/teachers/${teacher.user_id}`)}
								onKeyDown={(e) => e.key === 'Enter' && navigate(`/teachers/${teacher.user_id}`)}
								role="button"
								tabIndex={0}
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
													<Badge key={name} variant="secondary" className="text-[10px] px-1.5 py-0">
														{name}
													</Badge>
												))
											) : (
												<span className="text-xs text-muted-foreground">Geen lesvakken</span>
											)}
										</div>
									</div>
								</div>
								<div className="text-right">
									<span className="text-sm font-medium">{teacher.availableSlotCount}</span>
									<p className="text-[10px] text-muted-foreground">slots</p>
								</div>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
