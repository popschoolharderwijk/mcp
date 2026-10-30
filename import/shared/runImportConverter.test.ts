import { describe, expect, it } from 'bun:test';
import type { ImportConverter } from './converterTypes';
import { createEmptyReport } from './reportHelpers';
import { resolveImportConverterBatch } from './runImportConverter';

describe('resolveImportConverterBatch', () => {
	it('uses buildBatch when the converter defines it', () => {
		const batch = {
			idMap: { version: 1 as const, maps: {} },
			sqlRows: [{ id: 'custom' }],
			report: createEmptyReport(),
		};
		const converter: ImportConverter<{ mongoOid: string }, { id: string }, 'profiles'> = {
			name: 'profiles',
			entityType: 'profile',
			mappedKeys: new Set(),
			ignoredKeys: new Set(),
			mapDoc: (_doc, _idMap) => ({ ok: false, oid: null, reason: 'unused' }),
			warningsForRow: () => [],
			assignId: (row, id) => ({ ...row, mongoOid: id }),
			buildSql: () => '',
			buildBatch: () => batch,
		};

		const result = resolveImportConverterBatch(converter, [], {}, batch.idMap, () => 'new-id');
		expect(result).toBe(batch);
	});

	it('falls back to buildImportBatch when buildBatch is absent', () => {
		const idMap = { version: 1 as const, maps: {} };
		const converter: ImportConverter<{ mongoOid: string }, { mongoOid: string }, 'courses'> = {
			name: 'courses',
			entityType: 'course',
			mappedKeys: new Set(['name']),
			ignoredKeys: new Set(),
			mapDoc: (_doc, _idMap) => ({ ok: false, oid: 'oid-1', reason: 'bad doc' }),
			warningsForRow: () => [],
			assignId: (row, id) => ({ ...row, mongoOid: id }),
			buildSql: () => '',
		};

		const result = resolveImportConverterBatch(converter, [{ _id: { $oid: 'x' } }], {}, idMap, () => 'id');
		expect(result.idMap).toBe(idMap);
		expect(result.report.failed).toBe(1);
		expect(result.report.failures).toEqual([{ oid: 'oid-1', reason: 'bad doc' }]);
	});
});
