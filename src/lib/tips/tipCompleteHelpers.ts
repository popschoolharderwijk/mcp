import type { TipCompleteOn, TipDefinition } from '@/types/tips';

export function tipCompletesOn(tip: TipDefinition, mode: TipCompleteOn): boolean {
	return tip.completeOn.includes(mode);
}

export function resolveTipIdFromCompleteOn(registry: readonly TipDefinition[], mode: TipCompleteOn): string | null {
	return registry.find((tip) => tipCompletesOn(tip, mode))?.id ?? null;
}

export function resolveTipIdFromTargetClick(registry: readonly TipDefinition[], target: string | null): string | null {
	if (!target) return null;
	return registry.find((tip) => tip.target === target && tipCompletesOn(tip, 'target-click'))?.id ?? null;
}
