import { LuDatabase } from 'react-icons/lu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabaseConfig } from '@/integrations/supabase/config';
import { cn } from '@/lib/utils';

const PROJECT_CONFIG: Record<string, { label: string; color: string }> = {
	jserlqacarlgtdzrblic: { label: 'TEST', color: 'bg-green-500/20 text-green-600 dark:text-green-400' },
	zdvscmogkfyddnnxzkdu: { label: 'DEVELOPMENT', color: 'bg-orange-500/20 text-orange-600 dark:text-orange-400' },
	bnagepkxryauifzyoxgo: { label: 'PRODUCTION', color: 'bg-red-500/20 text-red-600 dark:text-red-400' },
};

export function EnvironmentBadge({ className }: { className?: string }) {
	const config = PROJECT_CONFIG[supabaseConfig.projectId] || {
		label: supabaseConfig.projectId.toUpperCase(),
		color: 'bg-gray-500/20 text-gray-600',
	};

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<span className={cn('flex items-center gap-1 text-[10px] font-medium cursor-help', className)}>
						<LuDatabase className="h-3 w-3" />
						{config.label}
					</span>
				</TooltipTrigger>
				<TooltipContent>
					<div className="text-xs">
						<div className="font-medium">Omgeving: {config.label}</div>
						<div className="text-muted-foreground font-mono text-[10px] mt-1">{supabaseConfig.projectId}</div>
						<div className="text-muted-foreground font-mono text-[10px]">{supabaseConfig.url}</div>
					</div>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
