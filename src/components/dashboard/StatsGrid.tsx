import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { NAV_ICONS } from '@/config/nav-items';
import type { DashboardStatItem } from '@/lib/dashboard/dashboardStatsGridHelpers';

const STAT_SKELETON_KEYS = ['one', 'two', 'three', 'four', 'five', 'six'] as const;

function dashboardStatsGridClass(count: number): string {
	if (count <= 3) return 'grid gap-2 md:grid-cols-2 lg:grid-cols-3';
	if (count === 4) return 'grid gap-2 md:grid-cols-2 lg:grid-cols-4';
	return 'grid gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6';
}

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
				{STAT_SKELETON_KEYS.slice(0, skeletonCount).map((key) => (
					<Card key={key}>
						<CardContent className="space-y-1 p-3">
							<div className="flex items-center gap-2">
								<Skeleton className="h-4 w-4 shrink-0" />
								<Skeleton className="h-4 w-24" />
							</div>
							<Skeleton className="h-7 w-12" />
						</CardContent>
					</Card>
				))}
			</div>
		);
	}

	return (
		<div className={gridClass}>
			{items.map((stat) => {
				const Icon = NAV_ICONS[stat.key];
				return (
					<Link
						key={stat.key}
						to={stat.href}
						className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<Card className="h-full overflow-hidden cursor-pointer transition-colors hover:bg-accent">
							<CardContent className="space-y-1 p-3">
								<div className="flex items-center gap-2 text-sm font-medium">
									<Icon className="h-4 w-4 shrink-0 text-primary" />
									<span className="truncate">{stat.title}</span>
								</div>
								<div className="text-2xl font-bold">{stat.value}</div>
								{stat.description && (
									<p className="text-xs text-muted-foreground">{stat.description}</p>
								)}
							</CardContent>
						</Card>
					</Link>
				);
			})}
		</div>
	);
}
