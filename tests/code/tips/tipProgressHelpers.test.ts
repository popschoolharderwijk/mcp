import { describe, expect, it } from 'bun:test';
import { mapTipProgressRows, shouldSkipTipStatusWrite } from '../../../src/lib/tips/tipProgressHelpers';

describe('mapTipProgressRows', () => {
	it('keeps dismissed and completed rows and maps last_action_at', () => {
		expect(
			mapTipProgressRows([
				{
					tip_id: 'a',
					status: 'completed',
					updated_at: '2026-01-01T00:00:00.000Z',
					last_action_at: '2026-01-01T00:00:00.000Z',
				},
				{
					tip_id: 'b',
					status: 'dismissed',
					updated_at: '2026-01-02T00:00:00.000Z',
					last_action_at: null,
				},
				{
					tip_id: 'c',
					status: 'pending',
					updated_at: '2026-01-03T00:00:00.000Z',
					last_action_at: null,
				},
			]),
		).toEqual({
			a: {
				status: 'completed',
				updatedAt: '2026-01-01T00:00:00.000Z',
				lastActionAt: '2026-01-01T00:00:00.000Z',
			},
			b: { status: 'dismissed', updatedAt: '2026-01-02T00:00:00.000Z', lastActionAt: null },
		});
	});
});

describe('shouldSkipTipStatusWrite', () => {
	it('skips when already completed', () => {
		expect(shouldSkipTipStatusWrite({ status: 'completed', updatedAt: 't', lastActionAt: 't' }, 'dismissed')).toBe(
			true,
		);
		expect(shouldSkipTipStatusWrite({ status: 'completed', updatedAt: 't', lastActionAt: 't' }, 'completed')).toBe(
			true,
		);
	});

	it('skips when status is unchanged and allows a real change', () => {
		expect(shouldSkipTipStatusWrite({ status: 'dismissed', updatedAt: 't', lastActionAt: null }, 'dismissed')).toBe(
			true,
		);
		expect(shouldSkipTipStatusWrite({ status: 'dismissed', updatedAt: 't', lastActionAt: null }, 'completed')).toBe(
			false,
		);
		expect(shouldSkipTipStatusWrite(undefined, 'completed')).toBe(false);
	});
});
