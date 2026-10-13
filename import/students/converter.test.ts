import { describe, expect, it } from 'bun:test';
import { buildImportBatch } from '../shared/buildImportBatchHelpers';
import { createEmptyIdMap } from '../shared/idMapHelpers';
import { studentsConverter } from './converter';

describe('studentsConverter', () => {
	it('creates rows, reuses id-map, ignores known keys, and records failures', () => {
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
					_id: { $oid: 'oid-fail' },
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
			() => 'uuid-new',
		);

		expect(batch.report.created).toBe(1);
		expect(batch.report.updated).toBe(1);
		expect(batch.report.failed).toBe(2);
		expect(batch.sqlRows).toHaveLength(2);
		expect(batch.idMap.student?.['oid-known']).toBe('uuid-known');
		expect(batch.idMap.student?.['oid-new']).toBe('uuid-new');
		expect(batch.report.warnings).toEqual([]);
		expect(batch.report.failures).toEqual([
			{ oid: 'oid-fail', reason: 'Missing email' },
			{ oid: 'oid-dup', reason: 'Duplicate email "a@example.com"' },
		]);
		expect(batch.report.skippedKeys).toEqual(['mystery_field']);
		expect(batch.report.ignoredKeys).toEqual(['comments', 'orgdebnumber', 'studentnumber']);
	});
});
