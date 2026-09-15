import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
	type DashboardStatItem,
	dashboardStatSkeletonKeys,
	dashboardStatsGridClass,
} from '@/lib/dashboard/dashboardStatsGridHelpers';

interface StatsGridProps {
	items: DashboardStatItem[];
	isLoading?: boolean;
	skeletonCount: number;
}

export function StatsGrid({ items, isLoading = false, skeletonCount }: StatsGridProps) {
	const gridClass = dashboardStatsGridClass(isLoading ? skeletonCount : items.length);

	if (isLoading) {
		return (
			<div className={gridClass}>
				{dashboardStatSkeletonKeys(skeletonCount).map((key) => (
					<Card key={key}>
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

	return (
		<div className={gridClass}>
			{items.map((stat) => (
				<Link
					key={stat.key}
					to={stat.href}
					className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<Card className="h-full overflow-hidden cursor-pointer hover:shadow-md">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
							<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
								<stat.icon className="h-5 w-5 text-primary" />
							</div>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{stat.value}</div>
							{stat.description && (
								<p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
							)}
						</CardContent>
					</Card>
				</Link>
			))}
		</div>
	);
}
