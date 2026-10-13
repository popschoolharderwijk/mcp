import { describe, expect, it } from 'bun:test';
import { classifySourceKeys } from './classifySourceKeysHelpers';

describe('classifySourceKeys', () => {
	it('splits unmapped keys into skipped vs intentionally ignored', () => {
		expect(
			classifySourceKeys(
				{ _id: 1, email: 'a@example.com', comments: 'x', mystery: true },
				new Set(['_id', 'email']),
				new Set(['comments']),
			),
		).toEqual({
			skippedKeys: ['mystery'],
			ignoredKeys: ['comments'],
		});
	});
});
