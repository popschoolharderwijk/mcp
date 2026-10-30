import { describe, expect, it } from 'bun:test';
import { dedupeImportRowsByUserId } from './dedupeImportRowsByUserIdHelpers';

describe('dedupeImportRowsByUserId', () => {
	it('keeps a single row per user id', () => {
		const rows = [
			{ userId: 'u1', value: 'first' },
			{ userId: 'u2', value: 'only' },
		];
		const result = dedupeImportRowsByUserId(rows, (existing, duplicate) => ({
			...existing,
			value: `${existing.value}+${duplicate.value}`,
		}));
		expect(result).toEqual([
			{ userId: 'u1', value: 'first' },
			{ userId: 'u2', value: 'only' },
		]);
	});

	it('merges duplicate user ids with the supplied merge function', () => {
		const rows = [
			{ userId: 'u1', score: 1 },
			{ userId: 'u1', score: 3 },
			{ userId: 'u1', score: 2 },
		];
		const result = dedupeImportRowsByUserId(rows, (existing, duplicate) => ({
			userId: existing.userId,
			score: existing.score + duplicate.score,
		}));
		expect(result).toEqual([{ userId: 'u1', score: 6 }]);
	});
});
