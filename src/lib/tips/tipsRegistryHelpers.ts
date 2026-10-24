import { TIP_TARGET_WAIT_MS } from '@/lib/tips/tipsConfig';
import type { TipDefinition, TipProgressMap } from '@/types/tips';

export function matchesRoute(tip: TipDefinition, pathname: string): boolean {
	return tip.routes.some((route) => route === '*' || route === pathname);
}

export type TipTargetPresent = (target: string) => boolean;

const alwaysPresent: TipTargetPresent = () => true;

/** First registry tip that matches the route, has a present target, and has no progress row. */
export function selectAutoTip(
	registry: readonly TipDefinition[],
	pathname: string,
	progress: TipProgressMap,
	isTargetPresent: TipTargetPresent = alwaysPresent,
): TipDefinition | null {
	for (const tip of registry) {
		if (progress[tip.id]) continue;
		if (!matchesRoute(tip, pathname)) continue;
		if (!isTargetPresent(tip.target)) continue;
		return tip;
	}
	return null;
}

/** True when at least one matching tip with a present target has no progress row yet. */
export function hasUnseenTipsForPage(
	registry: readonly TipDefinition[],
	pathname: string,
	progress: TipProgressMap,
	isTargetPresent: TipTargetPresent = alwaysPresent,
): boolean {
	return registry.some((tip) => !progress[tip.id] && matchesRoute(tip, pathname) && isTargetPresent(tip.target));
}

/** True when an unseen route-matching tip has no `[data-tip-target]` in the document yet. */
export function hasUnseenTipsAwaitingTarget(
	registry: readonly TipDefinition[],
	pathname: string,
	progress: TipProgressMap,
	isTargetPresent: TipTargetPresent = alwaysPresent,
): boolean {
	return registry.some((tip) => !progress[tip.id] && matchesRoute(tip, pathname) && !isTargetPresent(tip.target));
}

/** Page tips with a present target; most recently seen first (unseen last). */
export function listTipsForPage(
	registry: readonly TipDefinition[],
	pathname: string,
	progress: TipProgressMap,
	isTargetPresent: TipTargetPresent = alwaysPresent,
): TipDefinition[] {
	return registry
		.filter((tip) => matchesRoute(tip, pathname) && isTargetPresent(tip.target))
		.sort((left, right) => {
			const leftAt = progress[left.id]?.updatedAt ?? '';
			const rightAt = progress[right.id]?.updatedAt ?? '';
			return rightAt.localeCompare(leftAt);
		});
}

/** True when `[data-tip-target="…"]` exists in the document. */
export function tipTargetIsPresent(target: string): boolean {
	return document.querySelector(tipTargetSelector(target)) !== null;
}

export interface SpotlightRect {
	top: number;
	left: number;
	width: number;
	height: number;
}

export interface SpotlightViewport {
	width: number;
	height: number;
}

/** CSS `clip-path` polygon (evenodd) with a hole around `rect`. */
export function spotlightClipPath(rect: SpotlightRect, viewport: SpotlightViewport, padding: number): string {
	const x = Math.max(0, rect.left - padding);
	const y = Math.max(0, rect.top - padding);
	const w = rect.width + padding * 2;
	const h = rect.height + padding * 2;
	const x2 = Math.min(viewport.width, x + w);
	const y2 = Math.min(viewport.height, y + h);
	return `polygon(evenodd, 0 0, ${viewport.width}px 0, ${viewport.width}px ${viewport.height}px, 0 ${viewport.height}px, 0 0, ${x}px ${y}px, ${x}px ${y2}px, ${x2}px ${y2}px, ${x2}px ${y}px, ${x}px ${y}px)`;
}

export function tipTargetSelector(target: string): string {
	return `[data-tip-target="${target}"]`;
}

function isRadixDialogOpen(): boolean {
	return document.querySelector('[role="dialog"][data-state="open"]') !== null;
}

/** Resolves true when any of the targets exists (or appears within the wait window). */
export function waitForAnyTipTarget(targets: readonly string[], signal: AbortSignal): Promise<boolean> {
	if (targets.length === 0) return Promise.resolve(false);
	if (targets.some(tipTargetIsPresent)) return Promise.resolve(true);

	return new Promise((resolve) => {
		const timeout = window.setTimeout(() => {
			observer.disconnect();
			resolve(false);
		}, TIP_TARGET_WAIT_MS);

		const observer = new MutationObserver(() => {
			if (!targets.some(tipTargetIsPresent)) return;
			window.clearTimeout(timeout);
			observer.disconnect();
			resolve(true);
		});

		observer.observe(document.body, { childList: true, subtree: true });

		signal.addEventListener(
			'abort',
			() => {
				window.clearTimeout(timeout);
				observer.disconnect();
				resolve(false);
			},
			{ once: true },
		);
	});
}

/** Resolves true when `[data-tip-target]` exists (or appears within the wait window). */
export function waitForTipTarget(target: string, signal: AbortSignal): Promise<boolean> {
	return waitForAnyTipTarget([target], signal);
}

/** Resolves true when no Radix dialog is open; false if aborted while waiting. */
export function waitUntilNoRadixDialog(signal: AbortSignal): Promise<boolean> {
	if (!isRadixDialogOpen()) return Promise.resolve(true);

	return new Promise((resolve) => {
		const finish = (ok: boolean) => {
			observer.disconnect();
			resolve(ok);
		};

		const observer = new MutationObserver(() => {
			if (!isRadixDialogOpen()) finish(true);
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['data-state'],
		});

		signal.addEventListener('abort', () => finish(false), { once: true });
	});
}
