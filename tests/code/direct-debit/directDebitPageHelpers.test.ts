import { describe, expect, it } from 'bun:test';
import {
	buildDirectDebitBatchNumber,
	computeDefaultCollectionDate,
	mapDirectDebitBatchRows,
} from '../../../src/lib/direct-debit/directDebitPageHelpers';

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
