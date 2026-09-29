import type { ComponentType } from 'react';

/** Icon + label row shared by sidebar nav. */
export function NavIconLabel({
	icon: Icon,
	label,
	collapsed = false,
}: {
	icon: ComponentType<{ className?: string }>;
	label: string;
	collapsed?: boolean;
}) {
	return (
		<>
			<span className="grid size-8 shrink-0 place-items-center">
				<Icon className="h-4 w-4" />
			</span>
			{!collapsed && <span className="truncate">{label}</span>}
		</>
	);
}
