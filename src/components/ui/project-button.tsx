'use client';

import { LuChevronDown, LuX } from 'react-icons/lu';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NAV_ICONS } from '@/config/nav-labels';
import { cn } from '@/lib/utils';

const ProjectIcon = NAV_ICONS.projects;

export interface ProjectOption {
	id: string;
	name: string;
}

interface ProjectButtonProps {
	value: string | null;
	options: ProjectOption[];
	onChange: (projectId: string | null) => void;
	disabled?: boolean;
	/** Alleen tonen, niet bewerkbaar (geen dropdown, geen X) */
	readOnly?: boolean;
	className?: string;
}

/**
 * Button to select a project: shows "No project" or the selected project name,
 * with project icon (same as in nav) and an X on the right to clear the selection.
 */
export function ProjectButton({
	value,
	options,
	onChange,
	disabled = false,
	readOnly = false,
	className,
}: ProjectButtonProps) {
	const selected = options.find((p) => p.id === value);
	const label = selected ? selected.name : 'Geen project';

	const triggerClass = cn(
		'flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm text-left shadow-sm ring-offset-background [&_svg]:shrink-0',
		!value && 'text-muted-foreground',
		!readOnly && 'focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
		readOnly && 'cursor-default opacity-90',
		className,
	);

	if (readOnly) {
		return (
			<output className={triggerClass} aria-label={`Project: ${label}`}>
				<ProjectIcon className="h-4 w-4 opacity-70" aria-hidden />
				<span className="min-w-0 flex-1 truncate">{label}</span>
			</output>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger disabled={disabled} className={triggerClass} asChild>
				<div>
					<ProjectIcon className="h-4 w-4 opacity-70" aria-hidden />
					<span className="min-w-0 flex-1 truncate">{label}</span>
					{value ? (
						<button
							type="button"
							className="ml-1 rounded p-0.5 hover:bg-muted focus:outline-none focus:ring-1 focus:ring-ring"
							onPointerDown={(e) => e.stopPropagation()}
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								onChange(null);
							}}
							aria-label="Project verwijderen"
						>
							<LuX className="h-4 w-4" />
						</button>
					) : (
						<LuChevronDown className="h-4 w-4 opacity-50" aria-hidden />
					)}
				</div>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="start"
				className="max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[var(--radix-dropdown-menu-trigger-width)]"
			>
				{options.map((p) => (
					<DropdownMenuItem key={p.id} onSelect={() => onChange(p.id)} className="flex items-center gap-2">
						<ProjectIcon className="h-4 w-4 opacity-70" />
						{p.name}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
