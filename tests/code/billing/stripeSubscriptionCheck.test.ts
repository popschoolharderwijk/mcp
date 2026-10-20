import { describe, expect, it } from 'bun:test';
import { summarizeSubscriptionCheck } from '../../../src/lib/billing/stripeSubscriptionCheck';

describe('summarizeSubscriptionCheck', () => {
	it('reports missing Stripe configuration', () => {
		expect(summarizeSubscriptionCheck({ configured: false, results: [] })).toBe('Stripe is nog niet ingesteld');
	});
	it('reports all ok', () => {
		expect(
			summarizeSubscriptionCheck({
				configured: true,
				results: [{ lesson_agreement_id: 'a', status: 'ok', diff_cents: 0 }],
			}),
		).toBe('Alle 1 abonnementen kloppen');
	});
	it('counts mismatches and errors', () => {
		expect(
			summarizeSubscriptionCheck({
				configured: true,
				results: [
					{ lesson_agreement_id: 'a', status: 'mismatch', diff_cents: 100 },
					{ lesson_agreement_id: 'b', status: 'error', diff_cents: 0 },
					{ lesson_agreement_id: 'c', status: 'ok', diff_cents: 0 },
				],
			}),
		).toBe('3 gecontroleerd: 1 wijkt af, 1 met fout');
	});
});
