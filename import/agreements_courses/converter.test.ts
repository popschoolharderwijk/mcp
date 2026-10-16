import { describe, expect, it } from 'bun:test';
import { buildImportBatch } from '../shared/buildImportBatchHelpers';
import { createEmptyIdMap, setMappedId } from '../shared/idMapHelpers';
import { agreementsCoursesConverter } from './converter';

describe('agreementsCoursesConverter', () => {
	it('creates rows from prepared context and id-map, and records ignored keys', () => {
		agreementsCoursesConverter.prepareContext?.([
			[{ _id: { $oid: 'df-1' }, value: '1x30m/1wk' }],
			[
				{
					_id: { $oid: 'course-1' },
					frequency_mnd_prices: [{ durationfreq: { $oid: 'df-1' }, price: 50, startdate: '2026-01-01' }],
				},
			],
		]);

		let idMap = createEmptyIdMap();
		idMap = setMappedId(idMap, 'student', 'student-1', 'student-uuid');
		idMap = setMappedId(idMap, 'teacher', 'teacher-1', 'teacher-uuid');
		idMap = setMappedId(idMap, 'lesson_type', 'course-1', 'lesson-type-uuid');

		const batch = buildImportBatch(
			[
				{
					_id: { $oid: 'agreement-1' },
					course: { $oid: 'course-1' },
					student: { $oid: 'student-1' },
					teacher: { $oid: 'teacher-1' },
					durationfreq: { $oid: 'df-1' },
					paymenttype: 'incasso',
					startdate: '2024-08-26',
					schedule: [{ startdatetime: '2026-02-24T19:35:52Z' }],
					events: [],
					processed: [],
					extra_costs: [],
					debtor: { $oid: 'debtor-1' },
					numberoflessons: 10,
					autorenewal: true,
					custom_monthly_price: false,
					enddate: '2025-01-01',
					funding: null,
					haltbilling: false,
					noscheduling: false,
					teacher_notes: 'note',
					mystery_field: true,
				},
			],
			agreementsCoursesConverter,
			idMap,
			() => 'agreement-uuid',
		);

		expect(batch.report.created).toBe(1);
		expect(batch.report.failed).toBe(0);
		expect(batch.sqlRows).toHaveLength(1);
		expect(batch.sqlRows[0]?.agreementId).toBe('agreement-uuid');
		expect(batch.sqlRows[0]?.pricePerLesson).toBe(50);
		expect(batch.sqlRows[0]?.endDate).toBe('2025-01-01');
		expect(batch.idMap.lesson_agreement?.['agreement-1']).toBe('agreement-uuid');
		expect(batch.report.skippedKeys).toEqual(['mystery_field']);
		expect(batch.report.ignoredKeys).toEqual([
			'autorenewal',
			'custom_monthly_price',
			'debtor',
			'events',
			'extra_costs',
			'funding',
			'haltbilling',
			'noscheduling',
			'numberoflessons',
			'processed',
			'teacher_notes',
		]);
	});
});
