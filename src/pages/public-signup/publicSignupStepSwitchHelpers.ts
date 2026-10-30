export type PublicSignupRenderStep = 1 | 2 | 3 | 4 | null;

/** Which step body to render; steps 2 and 4 need a selected lesson type. */
export function resolvePublicSignupRenderStep(step: number, hasSelectedType: boolean): PublicSignupRenderStep {
	if (step === 1) return 1;
	if (step === 2 && hasSelectedType) return 2;
	if (step === 3) return 3;
	if (step === 4 && hasSelectedType) return 4;
	return null;
}
