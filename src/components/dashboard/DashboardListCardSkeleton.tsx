import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardListCardSkeletonProps {
	icon: ReactNode;
	titleWidthClass: string;
	itemKeyPrefix: string;
	subtitleWidthClass?: string;
}

export function DashboardListCardSkeleton({
	icon,
	titleWidthClass,
	itemKeyPrefix,
	subtitleWidthClass = 'w-24',
}: DashboardListCardSkeletonProps) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<div className="flex items-center gap-2">
					{icon}
					<Skeleton className={`h-5 ${titleWidthClass}`} />
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-2">
					{[1, 2, 3].map((n) => (
						<div key={`${itemKeyPrefix}-${n}`} className="flex items-center gap-4">
							<Skeleton className="h-10 w-10 rounded-full" />
							<div className="flex-1 space-y-1">
								<Skeleton className="h-4 w-32" />
								<Skeleton className={`h-3 ${subtitleWidthClass}`} />
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
