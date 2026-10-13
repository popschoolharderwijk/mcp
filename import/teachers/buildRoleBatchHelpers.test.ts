import { describe, expect, it } from 'bun:test';
import { createEmptyIdMap, setMappedId } from '../shared/idMapHelpers';
import { buildTeachersRoleBatch } from './buildRoleBatchHelpers';

describe('buildTeachersRoleBatch', () => {
	it('uses id-map user ids and fails when profiles was not run', () => {
		let idMap = createEmptyIdMap();
		idMap = setMappedId(idMap, 'teacher', 't1', 'uuid-1');

		const batch = buildTeachersRoleBatch(
			[
				{
					_id: { $oid: 't1' },
					name: 'A',
					surname: 'B',
					email: 'a@example.com',
					vogdateissued: '2023-01-01',
				},
				{ _id: { $oid: 't-missing' }, name: 'C', surname: 'D', email: 'c@example.com' },
			],
			idMap,
		);

		expect(batch.sqlRows).toHaveLength(1);
		expect(batch.sqlRows[0]?.userId).toBe('uuid-1');
		expect(batch.sqlRows[0]?.cocIssuedOn).toBe('2023-01-01');
		expect(batch.report.failed).toBe(1);
		expect(batch.report.failures[0]?.reason).toContain('Missing id-map teacher');
	});
});
