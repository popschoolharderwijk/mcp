import { describe, expect, it } from 'bun:test';
import {
	buildDirectDebitBatchNumber,
	computeDefaultCollectionDate,
	mapDirectDebitBatchRows,
	resolveDirectDebitBatchTableView,
} from '../../../src/lib/direct-debit/directDebitPageHelpers';

describe('resolveDirectDebitBatchTableView', () => {
	it('returns loading while data loads', () => {
		expect(resolveDirectDebitBatchTableView(true, 3)).toBe('loading');
	});

	it('returns empty when no rows exist', () => {
		expect(resolveDirectDebitBatchTableView(false, 0)).toBe('empty');
	});

	it('returns table when rows exist', () => {
		expect(resolveDirectDebitBatchTableView(false, 2)).toBe('table');
	});
});

describe('computeDefaultCollectionDate', () => {
	it('builds a collection date for the current month', () => {
		expect(computeDefaultCollectionDate(27, new Date('2026-03-15T12:00:00'))).toBe('2026-03-27');
	});
});

describe('buildDirectDebitBatchNumber', () => {
	it('starts with the INC prefix and month segment', () => {
		expect(buildDirectDebitBatchNumber('2026-03-27').startsWith('INC-202603-')).toBe(true);
	});
});

describe('mapDirectDebitBatchRows', () => {
	it('returns an empty array for null data', () => {
		expect(mapDirectDebitBatchRows(null)).toEqual([]);
	});
});
