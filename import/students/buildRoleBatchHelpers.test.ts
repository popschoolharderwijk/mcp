import { describe, expect, it } from 'bun:test';
import { createEmptyIdMap, setMappedId } from '../shared/idMapHelpers';
import { buildStudentsRoleBatch } from './buildRoleBatchHelpers';

describe('buildStudentsRoleBatch', () => {
	it('uses id-map user ids and fails when profiles was not run', () => {
		let idMap = createEmptyIdMap();
		idMap = setMappedId(idMap, 'student', 's1', 'uuid-1');

		const batch = buildStudentsRoleBatch(
			[
				{ _id: { $oid: 's1' }, name: 'A', surname: 'B', email: 'a@example.com', birthday: '2010-01-01' },
				{ _id: { $oid: 's-missing' }, name: 'C', surname: 'D', email: 'c@example.com' },
			],
			idMap,
		);

		expect(batch.sqlRows).toHaveLength(1);
		expect(batch.sqlRows[0]?.userId).toBe('uuid-1');
		expect(batch.sqlRows[0]?.dateOfBirth).toBe('2010-01-01');
		expect(batch.report.failed).toBe(1);
		expect(batch.report.failures[0]?.reason).toContain('Missing id-map student');
	});
});
