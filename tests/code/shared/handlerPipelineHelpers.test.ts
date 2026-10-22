import { describe, expect, it } from 'bun:test';
import { resolvePipelineFailure } from '../../../supabase/functions/_shared/handlerPipelineHelpers';

describe('resolvePipelineFailure', () => {
	it('returns null when all steps succeeded', () => {
		expect(resolvePipelineFailure([{ ok: true }, { ok: true }])).toBeNull();
	});

	it('returns the first failed step response', () => {
		const response = new Response('failed', { status: 400 });
		expect(
			resolvePipelineFailure([
				{ ok: true },
				{ ok: false, response },
				{ ok: false, response: new Response('later') },
			]),
		).toBe(response);
	});
});
