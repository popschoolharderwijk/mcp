import { describe, expect, it } from 'bun:test';
import { buildImportBatch } from '../shared/buildImportBatchHelpers';
import { createEmptyIdMap } from '../shared/idMapHelpers';
import { teachersConverter } from './converter';

describe('teachersConverter', () => {
	it('creates rows, reuses id-map, and records failures and warnings', () => {
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
					_id: { $oid: 'oid-fail' },
					name: 'No',
					surname: 'Email',
					email: '',
					user: 'legacy-user',
				},
			],
			teachersConverter,
			initial,
			() => 'uuid-new',
		);

		expect(batch.report.created).toBe(1);
		expect(batch.report.updated).toBe(1);
		expect(batch.report.failed).toBe(1);
		expect(batch.sqlRows).toHaveLength(2);
		expect(batch.idMap.teacher?.['oid-known']).toBe('uuid-known');
		expect(batch.idMap.teacher?.['oid-new']).toBe('uuid-new');
		expect(batch.report.warnings).toEqual([
			{ oid: 'oid-new', reason: 'Unmapped instrument "studio" (no lesson type link)' },
		]);
		expect(batch.report.failures).toEqual([{ oid: 'oid-fail', reason: 'Missing email' }]);
		expect(batch.report.skippedKeys).toEqual(['mystery_field']);
		expect(batch.report.ignoredKeys).toEqual(['assets', 'comments', 'user', 'vog']);
	});
});
