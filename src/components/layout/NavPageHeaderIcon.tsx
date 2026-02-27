import type { NavLabelKey } from '@/config/nav-labels';
import { NAV_ICONS } from '@/config/nav-labels';

/**
 * Renders the standard PageHeader icon (rounded circle, primary tint) for a nav item.
 * Use this so page headers share the same icon as the sidebar.
 */
export function NavPageHeaderIcon({ name }: { name: NavLabelKey }) {
	const Icon = NAV_ICONS[name];
	return (
		<div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10">
			<Icon className="h-8 w-8 text-primary" />
		</div>
	);
}
