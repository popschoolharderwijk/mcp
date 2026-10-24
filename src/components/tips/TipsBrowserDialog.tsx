import { LuCheck } from 'react-icons/lu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NAV_LABELS } from '@/config/nav-items';
import { TIPS_REGISTRY } from '@/lib/tips/tipsRegistry';
import { listTipsForPage, tipTargetIsPresent } from '@/lib/tips/tipsRegistryHelpers';
import type { TipProgressMap } from '@/types/tips';

interface TipsBrowserDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	pathname: string;
	progress: TipProgressMap;
	onShowTip: (tipId: string) => void;
}

export function TipsBrowserDialog({ open, onOpenChange, pathname, progress, onShowTip }: TipsBrowserDialogProps) {
	const tips = listTipsForPage(TIPS_REGISTRY, pathname, progress, tipTargetIsPresent);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>{NAV_LABELS.tips}</DialogTitle>
					<DialogDescription>
						Tips voor deze pagina. Klik op een tip om die opnieuw te bekijken.
					</DialogDescription>
				</DialogHeader>
				{tips.length === 0 ? (
					<p className="text-sm text-muted-foreground">Geen tips voor deze pagina.</p>
				) : (
					<ul className="space-y-2">
						{tips.map((tip) => {
							const seen = Boolean(progress[tip.id]);
							return (
								<li key={tip.id}>
									<button
										type="button"
										onClick={() => onShowTip(tip.id)}
										className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2.5 text-left transition-colors hover:border-primary hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									>
										<p className="min-w-0 flex-1 text-sm font-medium">{tip.title}</p>
										{seen ? (
											<LuCheck
												className="h-4 w-4 shrink-0 text-green-600 dark:text-green-500"
												aria-label="Gezien"
											/>
										) : null}
									</button>
								</li>
							);
						})}
					</ul>
				)}
			</DialogContent>
		</Dialog>
	);
}
