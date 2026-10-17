import { describe, expect, it } from 'bun:test';
import type { MongoIdMap } from '../shared/idMapHelpers';
import { createEmptyIdMap, setMappedId } from '../shared/idMapHelpers';
import { agreementsCoursesConverter } from './converter';

function prepareSoloCourseContext(): void {
	agreementsCoursesConverter.prepareContext?.([
		[{ _id: { $oid: 'df-1' }, value: '1x30m/1wk' }],
		[
			{
				_id: { $oid: 'course-1' },
				name: 'Piano',
				maxparticipants: 1,
				frequency_mnd_prices: [{ durationfreq: { $oid: 'df-1' }, price: 50, startdate: '2026-01-01' }],
			},
		],
	]);
}

function prepareGroupCourseContext(): void {
	agreementsCoursesConverter.prepareContext?.([
		[{ _id: { $oid: 'df-1' }, value: '1x60m/1wk' }],
		[
			{
				_id: { $oid: 'course-group' },
				name: 'Bandles',
				maxparticipants: 8,
				frequency_mnd_prices: [{ durationfreq: { $oid: 'df-1' }, price: 20, startdate: '2026-01-01' }],
			},
		],
	]);
}

function soloIdMap(): MongoIdMap {
	let idMap = createEmptyIdMap();
	idMap = setMappedId(idMap, 'student', 'student-1', 'student-uuid');
	idMap = setMappedId(idMap, 'teacher', 'teacher-1', 'teacher-uuid');
	return setMappedId(idMap, 'lesson_type', 'course-1', 'lesson-type-uuid');
}

function groupIdMap(): MongoIdMap {
	let idMap = createEmptyIdMap();
	idMap = setMappedId(idMap, 'student', 'student-1', 'student-uuid-1');
	idMap = setMappedId(idMap, 'student', 'student-2', 'student-uuid-2');
	idMap = setMappedId(idMap, 'teacher', 'teacher-1', 'teacher-uuid');
	return setMappedId(idMap, 'lesson_type', 'course-group', 'lesson-type-uuid');
}

const soloAgreementDoc = {
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
};

const groupAgreementDocs = [
	{
		_id: { $oid: 'agreement-1' },
		course: { $oid: 'course-group' },
		student: { $oid: 'student-1' },
		teacher: { $oid: 'teacher-1' },
		durationfreq: { $oid: 'df-1' },
		paymenttype: 'incasso',
		startdate: '2024-08-26',
		schedule: [{ startdatetime: '2026-02-24T19:00:00Z' }],
	},
	{
		_id: { $oid: 'agreement-2' },
		course: { $oid: 'course-group' },
		student: { $oid: 'student-2' },
		teacher: { $oid: 'teacher-1' },
		durationfreq: { $oid: 'df-1' },
		paymenttype: 'incasso',
		startdate: '2024-09-01',
		schedule: [{ startdatetime: '2026-02-24T19:00:00Z' }],
	},
];

describe('agreementsCoursesConverter solo mapping', () => {
	it('creates rows from prepared context and id-map', () => {
		prepareSoloCourseContext();
		const batch = agreementsCoursesConverter.buildBatch?.(
			[soloAgreementDoc],
			[],
			soloIdMap(),
			() => 'agreement-uuid',
		);

		expect(batch?.report.created).toBe(1);
		expect(batch?.report.failed).toBe(0);
		expect(batch?.sqlRows).toHaveLength(1);
		expect(batch?.sqlRows[0]?.agreementId).toBe('agreement-uuid');
		expect(batch?.sqlRows[0]?.pricePerLesson).toBe(50);
		expect(batch?.sqlRows[0]?.endDate).toBe('2025-01-01');
		expect(batch?.sqlRows[0]?.isGroupLesson).toBe(false);
		expect(batch?.sqlRows[0]?.lessonGroupId).toBeNull();
		expect(batch?.idMap.lesson_agreement?.['agreement-1']).toBe('agreement-uuid');
	});

	it('records skipped and ignored Mongo keys', () => {
		prepareSoloCourseContext();
		const batch = agreementsCoursesConverter.buildBatch?.(
			[soloAgreementDoc],
			[],
			soloIdMap(),
			() => 'agreement-uuid',
		);

		expect(batch?.report.skippedKeys).toEqual(['mystery_field']);
		expect(batch?.report.ignoredKeys).toEqual([
			'custom_monthly_price',
			'debtor',
			'extra_costs',
			'funding',
			'haltbilling',
			'noscheduling',
			'processed',
			'teacher_notes',
		]);
	});
});

describe('agreementsCoursesConverter group coalescing', () => {
	it('attaches a shared lesson_group id for same-slot members', () => {
		prepareGroupCourseContext();
		let nextId = 0;
		const ids = ['agreement-uuid-1', 'agreement-uuid-2', 'lesson-group-uuid'];
		const batch = agreementsCoursesConverter.buildBatch?.(
			groupAgreementDocs,
			[],
			groupIdMap(),
			() => ids[nextId++] ?? 'overflow',
		);

		expect(batch?.sqlRows).toHaveLength(2);
		expect(batch?.sqlRows[0]?.isGroupLesson).toBe(true);
		expect(batch?.sqlRows[1]?.isGroupLesson).toBe(true);
		expect(batch?.sqlRows[0]?.lessonGroupId).toBe('lesson-group-uuid');
		expect(batch?.sqlRows[1]?.lessonGroupId).toBe('lesson-group-uuid');
		expect(Object.values(batch?.idMap.lesson_group ?? {})).toEqual(['lesson-group-uuid']);
	});

	it('emits one lesson_group agenda event in SQL', () => {
		prepareGroupCourseContext();
		let nextId = 0;
		const ids = ['agreement-uuid-1', 'agreement-uuid-2', 'lesson-group-uuid'];
		const batch = agreementsCoursesConverter.buildBatch?.(
			groupAgreementDocs,
			[],
			groupIdMap(),
			() => ids[nextId++] ?? 'overflow',
		);

		const sql = agreementsCoursesConverter.buildSql(batch?.sqlRows ?? []);
		expect(sql).toContain('INSERT INTO public.lesson_groups');
		expect(sql).toContain("'lesson_group'::public.agenda_event_source_type");
		expect(sql.split("'lesson_group'::public.agenda_event_source_type")).toHaveLength(3);
		expect(sql).toContain("'lesson-group-uuid'::uuid");
	});
});
