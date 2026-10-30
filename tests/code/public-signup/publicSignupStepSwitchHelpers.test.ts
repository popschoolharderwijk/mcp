import { describe, expect, it } from 'bun:test';
import { resolvePublicSignupRenderStep } from '../../../src/pages/public-signup/publicSignupStepSwitchHelpers';

describe('resolvePublicSignupRenderStep', () => {
	it('returns step 1 for the first signup step', () => {
		expect(resolvePublicSignupRenderStep(1, false)).toBe(1);
	});

	it('returns step 2 only when a lesson type is selected', () => {
		expect(resolvePublicSignupRenderStep(2, true)).toBe(2);
		expect(resolvePublicSignupRenderStep(2, false)).toBeNull();
	});

	it('returns step 3 for the details step', () => {
		expect(resolvePublicSignupRenderStep(3, false)).toBe(3);
	});

	it('returns step 4 overview only when a lesson type is selected', () => {
		expect(resolvePublicSignupRenderStep(4, true)).toBe(4);
		expect(resolvePublicSignupRenderStep(4, false)).toBeNull();
	});
});
