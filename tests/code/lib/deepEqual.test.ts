import { describe, expect, it } from 'bun:test';
import { deepEqual } from '../../../src/lib/deepEqual';

describe('deepEqual', () => {
	it('treats identical primitives as equal', () => {
		expect(deepEqual(1, 1)).toBe(true);
		expect(deepEqual('row', 'row')).toBe(true);
		expect(deepEqual(true, true)).toBe(true);
	});

	it('rejects mismatched primitives and types', () => {
		expect(deepEqual(1, 2)).toBe(false);
		expect(deepEqual('row', 'rows')).toBe(false);
		expect(deepEqual(1, '1')).toBe(false);
		expect(deepEqual(true, false)).toBe(false);
	});

	it('treats null and undefined as equal only to themselves', () => {
		expect(deepEqual(null, null)).toBe(true);
		expect(deepEqual(undefined, undefined)).toBe(true);
		expect(deepEqual(null, undefined)).toBe(false);
		expect(deepEqual(null, {})).toBe(false);
		expect(deepEqual(undefined, {})).toBe(false);
	});

	it('compares arrays by length and nested values', () => {
		expect(deepEqual([1, { id: 2 }], [1, { id: 2 }])).toBe(true);
		expect(deepEqual([1], [1, 2])).toBe(false);
		expect(deepEqual([1, 2], [1, 3])).toBe(false);
	});

	it('compares objects by keys regardless of insertion order', () => {
		expect(deepEqual({ b: 2, a: 1 }, { a: 1, b: 2 })).toBe(true);
		expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
		expect(deepEqual({ a: 1, b: 2 }, { a: 1, c: 2 })).toBe(false);
		expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
	});

	it('rejects array versus object with the same contents', () => {
		expect(deepEqual([1], { 0: 1 })).toBe(false);
	});
});
