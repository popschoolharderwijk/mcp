import { afterEach, beforeAll, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';
import type { MergedSlotMember } from '../../../src/components/agenda/types';

const revertCalls: { eventId: string; originalDate: string }[] = [];
let revertOk = true;

mock.module('../../../src/integrations/supabase/client', () => ({
	supabase: {
		rpc: async () => ({ data: null, error: null }),
	},
}));

describe('revertMergedSlotLessons', () => {
	let revertMergedSlotLessons: typeof import('../../../src/lib/agenda/revertMergedSlotLessons').revertMergedSlotLessons;
	let revertDeviationModule: typeof import('../../../src/lib/agenda/revertDeviation');
	let revertDeviationSpy: ReturnType<typeof spyOn>;

	beforeAll(async () => {
		revertDeviationModule = await import('../../../src/lib/agenda/revertDeviation');
		({ revertMergedSlotLessons } = await import('../../../src/lib/agenda/revertMergedSlotLessons'));
	});

	beforeEach(() => {
		revertCalls.length = 0;
		revertOk = true;
		revertDeviationSpy = spyOn(revertDeviationModule, 'revertDeviation').mockImplementation(
			async (params: { eventId: string; originalDate: string }) => {
				revertCalls.push(params);
				if (!revertOk) return { ok: false, message: 'Fout bij terugzetten' };
				return { ok: true, message: 'Afspraak teruggezet naar origineel' };
			},
		);
	});

	afterEach(() => {
		revertDeviationSpy.mockRestore();
	});

	it('reverts every deviant member in a same-slot merge', async () => {
		const members: MergedSlotMember[] = [
			{ eventId: 'event-anna', originalDate: '2026-09-07', isDeviation: false },
			{
				eventId: 'event-bob',
				originalDate: '2026-09-07',
				isDeviation: true,
				hasTimeOrDateChange: true,
				deviationId: 'dev-bob',
			},
			{
				eventId: 'event-cara',
				originalDate: '2026-09-01',
				isDeviation: true,
				hasTimeOrDateChange: true,
				deviationId: 'dev-cara',
			},
		];

		const result = await revertMergedSlotLessons(members);
		expect(result.ok).toBe(true);
		expect(result.message).toBe('Lessen teruggezet naar hun originele tijden');
		expect(revertCalls).toEqual([
			{ eventId: 'event-bob', originalDate: '2026-09-07' },
			{ eventId: 'event-cara', originalDate: '2026-09-01' },
		]);
	});

	it('falls back to the single selected event when no merged members are revertible', async () => {
		const result = await revertMergedSlotLessons([], {
			eventId: 'event-1',
			originalDate: '2026-09-07',
		});
		expect(result.ok).toBe(true);
		expect(revertCalls).toEqual([{ eventId: 'event-1', originalDate: '2026-09-07' }]);
	});
});
