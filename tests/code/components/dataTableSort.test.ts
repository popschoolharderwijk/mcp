import { describe, expect, it } from 'bun:test';
import { resolveDataTableSortColumn, resolveDataTableSortDirection } from '../../../src/components/ui/data-table';

const columns = [{ key: 'reference', sortable: true }, { key: 'actions', sortable: false }, { key: 'status' }];

describe('resolveDataTableSortColumn', () => {
	it('uses the preferred column when it is sortable', () => {
		expect(resolveDataTableSortColumn(columns, 'status')).toBe('status');
	});

	it('leaves sort unset when the caller omits a column', () => {
		expect(resolveDataTableSortColumn(columns, null)).toBe(null);
		expect(resolveDataTableSortColumn(columns, undefined)).toBe(null);
	});

	it('leaves sort unset when the preferred column is missing or not sortable', () => {
		expect(resolveDataTableSortColumn(columns, 'missing')).toBe(null);
		expect(resolveDataTableSortColumn(columns, 'actions')).toBe(null);
	});

	it('returns null when no column can be sorted', () => {
		expect(resolveDataTableSortColumn([{ key: 'actions', sortable: false }], null)).toBe(null);
	});
});

describe('resolveDataTableSortDirection', () => {
	it('keeps descending', () => {
		expect(resolveDataTableSortDirection('desc')).toBe('desc');
	});

	it('keeps ascending', () => {
		expect(resolveDataTableSortDirection('asc')).toBe('asc');
	});

	it('leaves direction unset when the caller omits it', () => {
		expect(resolveDataTableSortDirection(null)).toBe(null);
		expect(resolveDataTableSortDirection(undefined)).toBe(null);
	});
});
