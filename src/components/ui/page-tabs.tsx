import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export interface PageTabItem<T extends string> {
	value: T;
	label: ReactNode;
}

interface PageTabsProps<T extends string> {
	value: T;
	onValueChange: (tab: T) => void;
	isTabId: (value: string) => value is T;
	items: readonly PageTabItem<T>[];
	children: ReactNode;
	className?: string;
	/**
	 * `half` constrains the whole tab shell (list + panels) to half the container
	 * on large screens. Default `full`.
	 */
	width?: 'full' | 'half';
}

/** URL-synced tab shell shared by detail pages and Beheer Instellingen. */
export function PageTabs<T extends string>({
	value,
	onValueChange,
	isTabId,
	items,
	children,
	className = 'space-y-2',
	width = 'full',
}: PageTabsProps<T>) {
	const tabs = (
		<Tabs
			value={value}
			onValueChange={(next) => {
				if (isTabId(next)) onValueChange(next);
			}}
			className={className}
		>
			<TabsList>
				{items.map((item) => (
					<TabsTrigger key={item.value} value={item.value}>
						{item.label}
					</TabsTrigger>
				))}
			</TabsList>
			{children}
		</Tabs>
	);

	if (width === 'half') {
		return (
			<div className="grid gap-6 lg:grid-cols-2">
				<div className="min-w-0">{tabs}</div>
			</div>
		);
	}

	return tabs;
}

type PageTabsContentProps = ComponentPropsWithoutRef<typeof TabsContent> & {
	/**
	 * `half` keeps panel content to half the tab shell on large screens
	 * (same layout as leerling/docent profile columns). Default `full`.
	 * Use when the tab shell stays `width="full"` but the form should be narrow.
	 */
	panelWidth?: 'full' | 'half';
};

export function PageTabsContent({ panelWidth = 'full', className, children, ...props }: PageTabsContentProps) {
	return (
		<TabsContent className={cn(className)} {...props}>
			{panelWidth === 'half' ? (
				<div className="grid gap-6 lg:grid-cols-2">
					<div className="min-w-0">{children}</div>
				</div>
			) : (
				children
			)}
		</TabsContent>
	);
}
