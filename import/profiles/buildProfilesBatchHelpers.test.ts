import { describe, expect, it } from 'bun:test';
import { createEmptyIdMap, setMappedId } from '../shared/idMapHelpers';
import { buildProfilesBatch } from './buildProfilesBatchHelpers';

describe('buildProfilesBatch', () => {
	it('merges teacher and student when email and name match (trim/lcase), filling nulls', () => {
		const batch = buildProfilesBatch(
			[
				{
					_id: { $oid: 'teacher-1' },
					name: '  Alex ',
					surname: 'BOTH',
					email: 'Shared@example.com',
					vogdateissued: '2023-01-01',
				},
			],
			[
				{
					_id: { $oid: 'student-same' },
					name: 'alex',
					surname: 'both',
					email: 'shared@example.com',
					birthday: '1990-05-05',
					phone: '0612345678',
				},
				{
					_id: { $oid: 'student-kid' },
					name: 'Kid',
					surname: 'Other',
					email: 'shared@example.com',
				},
			],
			createEmptyIdMap(),
			(() => {
				let n = 0;
				return () => `uuid-${++n}`;
			})(),
		);

		expect(batch.idMap.teacher?.['teacher-1']).toBe('uuid-1');
		expect(batch.idMap.student?.['student-same']).toBe('uuid-1');
		expect(batch.idMap.student?.['student-kid']).toBe('uuid-2');
		expect(batch.sqlRows).toHaveLength(2);

		const shared = batch.sqlRows.find((row) => row.email.toLowerCase() === 'shared@example.com');
		expect(shared).toEqual({
			userId: 'uuid-1',
			email: 'Shared@example.com',
			firstName: 'Alex',
			lastName: 'BOTH',
			phoneNumber: '0612345678',
			streetName: null,
			houseNumber: null,
			postalCode: null,
			city: null,
			countryCode: 'NL',
			isTeacher: true,
			isStudent: true,
			cocIssuedOn: '2023-01-01',
			dateOfBirth: '1990-05-05',
		});

		expect(batch.sqlRows.map((row) => row.email).sort()).toEqual([
			'Shared@example.com',
			'duplicate_1_shared@example.com',
		]);
		expect(batch.report.warnings).toEqual([
			{
				oid: 'student-same',
				reason: 'Same name and email as existing profile; sharing user id',
			},
			{
				oid: 'student-kid',
				reason: 'Duplicate email "shared@example.com"; using "duplicate_1_shared@example.com"',
			},
		]);
	});

	it('remaps a stale student oid onto the teacher when name and email match', () => {
		let idMap = createEmptyIdMap();
		idMap = setMappedId(idMap, 'teacher', 'teacher-1', 'uuid-teacher');
		idMap = setMappedId(idMap, 'student', 'student-1', 'uuid-stale-student');

		const batch = buildProfilesBatch(
			[
				{
					_id: { $oid: 'teacher-1' },
					name: 'Alex',
					surname: 'Both',
					email: 'shared@example.com',
				},
			],
			[
				{
					_id: { $oid: 'student-1' },
					name: 'Alex',
					surname: 'Both',
					email: 'shared@example.com',
					birthday: '1990-01-01',
				},
			],
			idMap,
			() => 'uuid-should-not-be-used',
		);

		expect(batch.idMap.teacher?.['teacher-1']).toBe('uuid-teacher');
		expect(batch.idMap.student?.['student-1']).toBe('uuid-teacher');
		expect(batch.sqlRows).toHaveLength(1);
		expect(batch.sqlRows[0]?.isTeacher).toBe(true);
		expect(batch.sqlRows[0]?.isStudent).toBe(true);
		expect(batch.sqlRows[0]?.dateOfBirth).toBe('1990-01-01');
	});

	it('rewrites parent-shared emails across students with different names', () => {
		const batch = buildProfilesBatch(
			[],
			[
				{ _id: { $oid: 's1' }, name: 'Kid', surname: 'One', email: 'parent@example.com' },
				{ _id: { $oid: 's2' }, name: 'Kid', surname: 'Two', email: 'parent@example.com' },
			],
			createEmptyIdMap(),
			(() => {
				let n = 0;
				return () => `uuid-${++n}`;
			})(),
		);

		expect(batch.sqlRows).toHaveLength(2);
		expect(batch.idMap.student?.s1).toBe('uuid-1');
		expect(batch.idMap.student?.s2).toBe('uuid-2');
		expect(batch.sqlRows.map((row) => row.email).sort()).toEqual([
			'duplicate_1_parent@example.com',
			'parent@example.com',
		]);
	});

	it('merges two teachers with the same name and email', () => {
		const batch = buildProfilesBatch(
			[
				{ _id: { $oid: 't1' }, name: 'A', surname: 'Same', email: 'a@example.com', phone: '0611111111' },
				{
					_id: { $oid: 't2' },
					name: 'a',
					surname: 'same',
					email: 'A@example.com',
					vogdateissued: '2024-01-01',
				},
			],
			[],
			createEmptyIdMap(),
			(() => {
				let n = 0;
				return () => `uuid-${++n}`;
			})(),
		);

		expect(batch.sqlRows).toHaveLength(1);
		expect(batch.idMap.teacher?.t1).toBe('uuid-1');
		expect(batch.idMap.teacher?.t2).toBe('uuid-1');
		expect(batch.sqlRows[0]?.phoneNumber).toBe('0611111111');
		expect(batch.sqlRows[0]?.cocIssuedOn).toBe('2024-01-01');
	});

	it('rewrites duplicate emails within teachers when names differ', () => {
		const batch = buildProfilesBatch(
			[
				{ _id: { $oid: 't1' }, name: 'A', surname: 'One', email: 'a@example.com' },
				{ _id: { $oid: 't2' }, name: 'B', surname: 'Two', email: 'a@example.com' },
			],
			[],
			createEmptyIdMap(),
			(() => {
				let n = 0;
				return () => `uuid-${++n}`;
			})(),
		);

		expect(batch.sqlRows.map((row) => row.email).sort()).toEqual(['a@example.com', 'duplicate_1_a@example.com']);
	});
});
