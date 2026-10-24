import type { IconType } from 'react-icons';
import { LuCalendar, LuChevronLeft, LuFilter, LuMaximize2, LuMoon, LuSearch, LuSun } from 'react-icons/lu';
import { TipKbd } from '@/components/tips/TipKbd';
import { NAV_ICONS } from '@/config/nav-items';
import { parseTipBody } from '@/lib/tips/tipBodyHelpers';
import { cn } from '@/lib/utils';

interface TipBodyProps {
	body: string;
	className?: string;
}

/** Inline icons for `{{icon:…}}` tip-body tokens. Styling matches the live control they describe. */
const TIP_BODY_ICONS: Record<string, { Icon: IconType; className?: string }> = {
	tips: { Icon: NAV_ICONS.tips, className: 'fill-yellow-400 text-yellow-500' },
	sun: { Icon: LuSun },
	moon: { Icon: LuMoon },
	search: { Icon: LuSearch },
	filter: { Icon: LuFilter },
	'chevron-left': { Icon: LuChevronLeft },
	maximize: { Icon: LuMaximize2 },
	calendar: { Icon: LuCalendar },
};

export function TipBody({ body, className }: TipBodyProps) {
	const parts = parseTipBody(body);
	return (
		<span className={cn('inline', className)}>
			{parts.map((part) => {
				if (part.type === 'key') {
					return <TipKbd key={part.key}>{part.value}</TipKbd>;
				}
				if (part.type === 'icon') {
					const entry = TIP_BODY_ICONS[part.value];
					if (!entry) {
						return null;
					}
					const { Icon, className: iconClassName } = entry;
					return (
						<Icon
							key={part.key}
							className={cn('mx-0.5 inline h-4 w-4 align-text-bottom', iconClassName)}
							aria-hidden
						/>
					);
				}
				return <span key={part.key}>{part.value}</span>;
			})}
		</span>
	);
}
