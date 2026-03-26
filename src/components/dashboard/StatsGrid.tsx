import { useNavigate } from 'react-router-dom';
import {
	LuCalendar,
	LuClock,
	LuFileText,
	LuGraduationCap,
	LuMusic,
	LuUsers,
} from 'react-icons/lu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardStats } from '@/hooks/useDashboardData';

interface StatItem {
	title: string;
	value: number | string;
	icon: React.ComponentType<{ className?: string }>;
	description?: string;
	href: string;
}

interface StatsGridProps {
	stats: DashboardStats | null;
	isLoading?: boolean;
}

function buildStatItems(s: DashboardStats): StatItem[] {
	return [
		{
			title: 'Leerlingen',
			value: s.totalStudents,
			icon: LuUsers,
			href: '/students',
		},
		{
			title: 'Actieve Afspraken',
			value: s.activeAgreements,
			icon: LuFileText,
			description: s.inactiveAgreements > 0 ? `${s.inactiveAgreements} inactief` : undefined,
			href: '/agreements',
		},
		{
			title: 'Docenten',
			value: s.activeTeachers,
			icon: LuGraduationCap,
			href: '/teachers',
		},
		{
			title: 'Beschikbare Slots',
			value: s.availableSlots,
			icon: LuClock,
			description: 'Docentbeschikbaarheid',
			href: '/teachers/availability',
		},
		{
			title: 'Lesvakken',
			value: s.activeLessonTypes,
			icon: LuMusic,
			href: '/lesson-types',
		},
		{
			title: 'Agenda',
			value: '→',
			icon: LuCalendar,
			description: 'Bekijk het rooster',
			href: '/agenda',
		},
	];
}

export function StatsGrid({ stats, isLoading = false }: StatsGridProps) {
	const navigate = useNavigate();

	if (isLoading || !stats) {
		return (
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
				{[1, 2, 3, 4, 5, 6].map((n) => (
					<Card key={`stat-skeleton-${n}`}>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-8 w-8 rounded-full" />
						</CardHeader>
						<CardContent>
							<Skeleton className="h-8 w-16 mb-1" />
							<Skeleton className="h-3 w-20" />
						</CardContent>
					</Card>
				))}
			</div>
		);
	}

	const items = buildStatItems(stats);

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 stagger-children">
			{items.map((stat) => (
				<Card
					key={stat.title}
					className="overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
					onClick={() => navigate(stat.href)}
				>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
							<stat.icon className="h-5 w-5 text-primary" />
						</div>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stat.value}</div>
						{stat.description && <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>}
					</CardContent>
				</Card>
			))}
		</div>
	);
}
