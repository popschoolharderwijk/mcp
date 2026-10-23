import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { type PageContentWidth, wrapPageContentWidth } from '@/lib/layout/pageContentWidthHelpers';
import { cn } from '@/lib/utils';

export type { PageContentWidth };

export interface PageShellProps {
	title: ReactNode;
	description?: ReactNode;
	/** Optional action buttons on the right (e.g. create). */
	actions?: ReactNode;
	children?: ReactNode;
	/** When true, show a body skeleton instead of children; header stays visible. */
	loading?: boolean;
	className?: string;
	contentClassName?: string;
	/**
	 * Tailwind fraction of the container on large screens. Default `full`.
	 */
	width?: PageContentWidth;
}

/** Body placeholder matching typical PageShell content (search + table/cards). */
export function PageShellBodySkeleton({ className }: { className?: string }) {
	return (
		<div className={cn('space-y-4', className)}>
			<Skeleton className="h-9 w-full max-w-sm" />
			<Skeleton className="h-64 w-full rounded-lg" />
		</div>
	);
}

/**
 * Card-shaped loading shell when page title is not known yet (e.g. auth gate).
 * Prefer `<PageShell title=… loading />` when labels are known.
 */
export function PageShellPlaceholder({ className }: { className?: string }) {
	return (
		<Card className={className}>
			<CardHeader>
				<div className="space-y-2">
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-4 w-72" />
				</div>
			</CardHeader>
			<CardContent>
				<PageShellBodySkeleton />
			</CardContent>
		</Card>
	);
}

/**
 * Main-page frame: card with title, optional description and actions, then content.
 * Use for list/settings pages; put a DataTable (or any other body) in children.
 */
export function PageShell({
	title,
	description,
	actions,
	children,
	loading = false,
	className,
	contentClassName,
	width = 'full',
}: PageShellProps) {
	const card = (
		<Card className={className}>
			<CardHeader>
				<div className="flex items-center justify-between gap-4">
					<div>
						<CardTitle>{title}</CardTitle>
						{description != null && description !== '' && (
							<CardDescription className="mt-1">{description}</CardDescription>
						)}
					</div>
					{actions != null && !loading && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
				</div>
			</CardHeader>
			<CardContent className={cn(contentClassName)}>{loading ? <PageShellBodySkeleton /> : children}</CardContent>
		</Card>
	);

	return wrapPageContentWidth(width, card);
}
