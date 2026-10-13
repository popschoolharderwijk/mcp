import { describe, expect, it } from 'bun:test';
import { buildImportBatch } from '../shared/buildImportBatchHelpers';
import { createEmptyIdMap } from '../shared/idMapHelpers';
import { teachersConverter } from './converter';

describe('teachersConverter', () => {
	it('creates rows, reuses id-map, and assigns placeholders for missing/duplicate emails', () => {
		teachersConverter.prepareContext?.([]);
		const initial = createEmptyIdMap();
		initial.teacher = { 'oid-known': 'uuid-known' };

		const batch = buildImportBatch(
			[
				{
					_id: { $oid: 'oid-known' },
					name: 'Femke',
					surname: 'Bosman',
					email: 'a@example.com',
					instrument: 'zang',
					vogdateissued: '2023-12-06',
					vog: true,
					comments: 'note',
				},
				{
					_id: { $oid: 'oid-new' },
					name: 'Anna',
					surname: 'Test',
					email: 'b@example.com',
					instrument: 'studio',
					assets: { $oid: 'asset-1' },
					mystery_field: true,
				},
				{
					_id: { $oid: 'oid-no-email' },
					name: 'No',
					surname: 'Email',
					email: '',
					user: 'legacy-user',
				},
				{
					_id: { $oid: 'oid-dup' },
					name: 'Dup',
					surname: 'Email',
					email: 'a@example.com',
				},
			],
			teachersConverter,
			initial,
			(() => {
				let n = 0;
				return () => `uuid-new-${++n}`;
			})(),
		);

		expect(batch.report.created).toBe(3);
		expect(batch.report.updated).toBe(1);
		expect(batch.report.failed).toBe(0);
		expect(batch.sqlRows).toHaveLength(4);
		expect(batch.idMap.teacher?.['oid-known']).toBe('uuid-known');
		expect(batch.idMap.teacher?.['oid-new']).toBe('uuid-new-1');
		expect(batch.idMap.teacher?.['oid-no-email']).toBe('uuid-new-2');
		expect(batch.idMap.teacher?.['oid-dup']).toBe('uuid-new-3');
		expect(batch.sqlRows[2]?.email).toBe('missing_oid-no-email@example.com');
		expect(batch.sqlRows[3]?.email).toBe('duplicate_1_a@example.com');
		expect(batch.report.warnings).toEqual([
			{ oid: 'oid-no-email', reason: 'Missing email; using "missing_oid-no-email@example.com"' },
			{
				oid: 'oid-dup',
				reason: 'Duplicate email "a@example.com"; using "duplicate_1_a@example.com"',
			},
		]);
		expect(batch.report.failures).toEqual([]);
		expect(batch.report.skippedKeys).toEqual(['mystery_field']);
		expect(batch.report.ignoredKeys).toEqual(['assets', 'comments', 'instrument', 'user', 'vog']);
	});
});
