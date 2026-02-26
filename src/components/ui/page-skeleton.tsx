import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type PageSkeletonVariant = 'header-only' | 'header-and-cards' | 'header-and-tabs';

interface PageSkeletonProps {
	/** Show header block (avatar + title + subtitle). Default true. */
	showHeader?: boolean;
	/** Content layout variant. Default 'header-and-cards'. */
	variant?: PageSkeletonVariant;
	className?: string;
}

export function PageSkeleton({ showHeader = true, variant = 'header-and-cards', className }: PageSkeletonProps) {
	return (
		<div className={cn('space-y-6', className)}>
			{showHeader && (
				<div className="flex items-center gap-4">
					<Skeleton className="h-16 w-16 shrink-0 rounded-full" />
					<div className="flex-1 space-y-2">
						<Skeleton className="h-8 w-48" />
						<Skeleton className="h-4 w-32" />
					</div>
				</div>
			)}
			{variant === 'header-and-tabs' && (
				<>
					<div className="flex gap-2 border-b pb-2">
						<Skeleton className="h-9 w-24" />
						<Skeleton className="h-9 w-28" />
						<Skeleton className="h-9 w-20" />
					</div>
					<div className="space-y-4">
						<Skeleton className="h-32 w-full rounded-lg" />
						<Skeleton className="h-24 w-full rounded-lg" />
					</div>
				</>
			)}
			{variant === 'header-and-cards' && (
				<div className="grid gap-6 md:grid-cols-2">
					<div className="space-y-3 rounded-lg border p-4">
						<Skeleton className="h-5 w-40" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-20 w-full" />
					</div>
					<div className="space-y-3 rounded-lg border p-4">
						<Skeleton className="h-5 w-32" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-16 w-full" />
					</div>
				</div>
			)}
		</div>
	);
}

/** Compact skeleton for a section (e.g. profile section, lesson types). */
export function SectionSkeleton({ className }: { className?: string }) {
	return (
		<div className={cn('space-y-3', className)}>
			<Skeleton className="h-6 w-32" />
			<Skeleton className="h-20 w-full rounded-lg" />
			<Skeleton className="h-10 w-full rounded-lg" />
		</div>
	);
}
