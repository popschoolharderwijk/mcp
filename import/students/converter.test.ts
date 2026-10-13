import { describe, expect, it } from 'bun:test';
import { buildImportBatch } from '../shared/buildImportBatchHelpers';
import { createEmptyIdMap } from '../shared/idMapHelpers';
import { studentsConverter } from './converter';

describe('studentsConverter', () => {
	it('creates rows, reuses id-map, and assigns placeholders for missing/duplicate emails', () => {
		studentsConverter.prepareContext?.([]);
		const initial = createEmptyIdMap();
		initial.student = { 'oid-known': 'uuid-known' };

		const batch = buildImportBatch(
			[
				{
					_id: { $oid: 'oid-known' },
					name: 'Nick',
					surname: 'van de Brink',
					email: 'a@example.com',
					birthday: '2009-01-16',
					studentnumber: '9780',
					comments: 'note',
				},
				{
					_id: { $oid: 'oid-new' },
					name: 'Maud',
					surname: 'Meijer',
					email: 'b@example.com',
					orgdebnumber: '580005',
					mystery_field: true,
				},
				{
					_id: { $oid: 'oid-no-email' },
					name: 'No',
					surname: 'Email',
					email: '',
				},
				{
					_id: { $oid: 'oid-dup' },
					name: 'Dup',
					surname: 'Email',
					email: 'a@example.com',
				},
			],
			studentsConverter,
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
		expect(batch.idMap.student?.['oid-known']).toBe('uuid-known');
		expect(batch.idMap.student?.['oid-new']).toBe('uuid-new-1');
		expect(batch.idMap.student?.['oid-no-email']).toBe('uuid-new-2');
		expect(batch.idMap.student?.['oid-dup']).toBe('uuid-new-3');
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
		expect(batch.report.ignoredKeys).toEqual(['comments', 'orgdebnumber', 'studentnumber']);
	});
});
