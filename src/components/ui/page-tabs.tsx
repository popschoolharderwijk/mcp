import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type PageContentWidth, wrapPageContentWidth } from '@/lib/layout/pageContentWidthHelpers';
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
	 * Tailwind fraction of the container on large screens. Default `full`.
	 */
	width?: PageContentWidth;
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

	return wrapPageContentWidth(width, tabs);
}

type PageTabsContentProps = ComponentPropsWithoutRef<typeof TabsContent> & {
	/**
	 * Tailwind fraction within the tab shell on large screens
	 * (same layout as leerling/docent profile columns). Default `full`.
	 * Use when the tab shell stays `width="full"` but the form should be narrow.
	 */
	panelWidth?: PageContentWidth;
};

export function PageTabsContent({ panelWidth = 'full', className, children, ...props }: PageTabsContentProps) {
	return (
		<TabsContent className={cn(className)} {...props}>
			{wrapPageContentWidth(panelWidth, children)}
		</TabsContent>
	);
}
