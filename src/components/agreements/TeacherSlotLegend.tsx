import { LuCircleCheck, LuCircleX, LuLoaderCircle, LuRefreshCw, LuTriangleAlert } from 'react-icons/lu';
import { Button } from '@/components/ui/button';

interface TeacherSlotLegendProps {
	onReload?: () => void;
	reloading?: boolean;
}

export function TeacherSlotLegend({ onReload, reloading = false }: TeacherSlotLegendProps) {
	return (
		<div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
			<div className="flex flex-wrap items-center gap-3">
				<span className="inline-flex items-center gap-1">
					<LuCircleCheck className="h-3.5 w-3.5 text-green-600 dark:text-green-400" aria-hidden />
					Vrij
				</span>
				<span className="inline-flex items-center gap-1">
					<LuTriangleAlert className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden />
					Deels bezet
				</span>
				<span className="inline-flex items-center gap-1">
					<LuCircleX className="h-3.5 w-3.5 text-muted-foreground opacity-70" aria-hidden />
					Bezet
				</span>
			</div>
			{onReload ? (
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-7 w-7 shrink-0"
					onClick={onReload}
					disabled={reloading}
					aria-label="Tijdslotten vernieuwen"
					title="Tijdslotten vernieuwen"
				>
					{reloading ? (
						<LuLoaderCircle className="h-3.5 w-3.5 animate-spin" />
					) : (
						<LuRefreshCw className="h-3.5 w-3.5" />
					)}
				</Button>
			) : null}
		</div>
	);
}
