import { cn } from '@/lib/utils';

interface TipKbdProps {
	children: string;
	className?: string;
}

/** Keyboard key chip, e.g. `/` or `F` (letters always uppercase). */
export function TipKbd({ children, className }: TipKbdProps) {
	return (
		<kbd
			className={cn(
				'inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1.5 align-middle font-mono text-[0.7rem] font-semibold uppercase text-foreground shadow-sm',
				className,
			)}
		>
			{children}
		</kbd>
	);
}
