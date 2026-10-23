import type { ReactNode } from 'react';

/** Tailwind-style fraction widths for page shells and tab panels. */
export type PageContentWidth = 'full' | '1/2' | '3/4';

/** Constrain content to 1/2 or 3/4 of the container on large screens. */
export function wrapPageContentWidth(width: PageContentWidth, children: ReactNode): ReactNode {
	if (width === '1/2') {
		return (
			<div className="grid gap-6 lg:grid-cols-2">
				<div className="min-w-0">{children}</div>
			</div>
		);
	}
	if (width === '3/4') {
		return (
			<div className="grid gap-6 lg:grid-cols-4">
				<div className="min-w-0 lg:col-span-3">{children}</div>
			</div>
		);
	}
	return children;
}
