import { TIP_HOLE_PADDING } from '@/lib/tips/tipsConfig';
import { tipTargetSelector } from '@/lib/tips/tipsRegistryHelpers';

const CARD_GAP = 12;
const CARD_WIDTH = 320;
const CARD_ESTIMATED_HEIGHT = 160;

export function readTipTargetRect(target: string): DOMRect | null {
	const el = document.querySelector(tipTargetSelector(target));
	if (!(el instanceof HTMLElement)) return null;
	return el.getBoundingClientRect();
}

export function tipSpotlightHole(rect: DOMRect): {
	top: number;
	left: number;
	width: number;
	height: number;
} {
	return {
		top: Math.max(0, rect.top - TIP_HOLE_PADDING),
		left: Math.max(0, rect.left - TIP_HOLE_PADDING),
		width: rect.width + TIP_HOLE_PADDING * 2,
		height: rect.height + TIP_HOLE_PADDING * 2,
	};
}

export function tipSpotlightCardPosition(
	rect: DOMRect,
	viewport: { width: number; height: number } = {
		width: typeof window !== 'undefined' ? window.innerWidth : 0,
		height: typeof window !== 'undefined' ? window.innerHeight : 0,
	},
): { top: number; left: number } {
	const below = rect.bottom + CARD_GAP + TIP_HOLE_PADDING;
	const above = rect.top - CARD_GAP - TIP_HOLE_PADDING - CARD_ESTIMATED_HEIGHT;
	const top = below + CARD_ESTIMATED_HEIGHT < viewport.height ? below : Math.max(8, above);
	const left = Math.min(Math.max(8, rect.left), viewport.width - CARD_WIDTH - 8);
	return { top, left };
}

export { CARD_WIDTH as TIP_SPOTLIGHT_CARD_WIDTH };
