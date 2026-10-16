import { LuRotateCcw } from 'react-icons/lu';
import { Button } from '@/components/ui/button';
import {
	getDeviationBannerOriginalDescription,
	getDeviationBannerPresentation,
} from '@/lib/agenda/deviationInfoBannerHelpers';
import type { DeviationInfo } from '@/types/agenda-events';

interface DeviationInfoBannerProps {
	deviationInfo: DeviationInfo;
	onRevert: () => void;
	disabled?: boolean;
	reverting?: boolean;
}

export function DeviationInfoBanner({ deviationInfo, onRevert, disabled, reverting }: DeviationInfoBannerProps) {
	const presentation = getDeviationBannerPresentation(deviationInfo.isCancelled ?? false);
	const originalDescription = getDeviationBannerOriginalDescription(deviationInfo);

	return (
		<div
			className={`flex items-center justify-between gap-3 rounded-lg p-3 text-sm ${presentation.containerClassName}`}
		>
			<div>
				<p className="font-medium">{presentation.title}</p>
				<p className="text-xs mt-1">{originalDescription}</p>
			</div>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				className={presentation.buttonClassName}
				onClick={onRevert}
				disabled={disabled || reverting}
			>
				<LuRotateCcw className="h-4 w-4 mr-1" />
				{reverting ? 'Terugzetten...' : 'Terugzetten'}
			</Button>
		</div>
	);
}
