import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LuX } from 'react-icons/lu';
import { TipBody } from '@/components/tips/TipBody';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
	readTipTargetRect,
	TIP_SPOTLIGHT_CARD_WIDTH,
	tipSpotlightCardPosition,
	tipSpotlightHole,
} from '@/lib/tips/tipSpotlightHelpers';
import { TIP_FADE_MS, TIP_HOLE_PADDING, TIP_SHOW_DELAY_MS } from '@/lib/tips/tipsConfig';
import { spotlightClipPath } from '@/lib/tips/tipsRegistryHelpers';
import { cn } from '@/lib/utils';
import type { TipDefinition } from '@/types/tips';

interface TipSpotlightProps {
	tip: TipDefinition;
	onDismiss: () => void;
	/** Skip the show delay (e.g. manual "Toon"); fade still runs. */
	immediate?: boolean;
}

export function TipSpotlight({ tip, onDismiss, immediate = false }: TipSpotlightProps) {
	const [rect, setRect] = useState<DOMRect | null>(() => readTipTargetRect(tip.target));
	const [ready, setReady] = useState(false);
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		setReady(false);
		setVisible(false);
		if (immediate) {
			setReady(true);
			return;
		}
		const delay = window.setTimeout(() => setReady(true), TIP_SHOW_DELAY_MS);
		return () => window.clearTimeout(delay);
	}, [immediate]);

	useEffect(() => {
		if (!ready) return;
		const frame = window.requestAnimationFrame(() => setVisible(true));
		return () => window.cancelAnimationFrame(frame);
	}, [ready]);

	useEffect(() => {
		const update = () => setRect(readTipTargetRect(tip.target));
		update();
		window.addEventListener('resize', update);
		window.addEventListener('scroll', update, true);
		return () => {
			window.removeEventListener('resize', update);
			window.removeEventListener('scroll', update, true);
		};
	}, [tip.target]);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return;
			event.preventDefault();
			onDismiss();
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [onDismiss]);

	if (!ready || !rect) return null;

	return createPortal(
		<TipSpotlightLayers tip={tip} rect={rect} visible={visible} onDismiss={onDismiss} />,
		document.body,
	);
}

function TipSpotlightLayers({
	tip,
	rect,
	visible,
	onDismiss,
}: {
	tip: TipDefinition;
	rect: DOMRect;
	visible: boolean;
	onDismiss: () => void;
}) {
	const hole = tipSpotlightHole(rect);
	const clipPath = spotlightClipPath(
		{ top: rect.top, left: rect.left, width: rect.width, height: rect.height },
		{ width: window.innerWidth, height: window.innerHeight },
		TIP_HOLE_PADDING,
	);
	const pos = tipSpotlightCardPosition(rect);
	const fadeStyle = {
		opacity: visible ? 1 : 0,
		transition: `opacity ${TIP_FADE_MS}ms ease-out`,
	};

	return (
		<div className="pointer-events-none fixed inset-0 z-[60]" aria-live="polite">
			<div
				className="pointer-events-auto absolute inset-0 bg-black/55 dark:bg-black/65"
				style={{ ...fadeStyle, clipPath }}
				aria-hidden
			/>
			{/* Soft glow + pulsing ring around the target (clicks pass through). */}
			<div
				className="absolute rounded-md"
				style={{
					...fadeStyle,
					top: hole.top,
					left: hole.left,
					width: hole.width,
					height: hole.height,
					boxShadow: '0 0 0 3px hsl(var(--primary)), 0 0 36px 10px hsl(var(--primary) / 0.6)',
				}}
				aria-hidden
			/>
			<div
				className={cn('absolute rounded-md border-2 border-primary', visible && 'animate-tip-ring-pulse')}
				style={{
					...fadeStyle,
					top: hole.top,
					left: hole.left,
					width: hole.width,
					height: hole.height,
				}}
				aria-hidden
			/>
			<Card
				className="pointer-events-auto absolute shadow-lg"
				style={{ ...fadeStyle, top: pos.top, left: pos.left, width: TIP_SPOTLIGHT_CARD_WIDTH }}
				role="status"
				aria-label={tip.title}
			>
				<CardHeader className="relative space-y-1.5 p-6 pr-12">
					<CardTitle className="text-base">{tip.title}</CardTitle>
					<CardDescription>
						<TipBody body={tip.body} />
					</CardDescription>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="absolute right-3 top-3 h-7 w-7 opacity-70 hover:opacity-100"
						onClick={onDismiss}
					>
						<LuX className="h-4 w-4" />
						<span className="sr-only">Sluiten</span>
					</Button>
				</CardHeader>
			</Card>
		</div>
	);
}
