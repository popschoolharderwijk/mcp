import { describe, expect, it } from 'bun:test';
import {
	buildBatchContextFromLoadedData,
	buildMandateMap,
	buildProfileMap,
	buildStudentMap,
	collectUniqueStudentIds,
	extractMandateIds,
	hasBatchItems,
	parseVatSettingsFromAppSetting,
} from '../../../supabase/functions/generate-invoice/loadBatchContextHelpers';
import type { BatchItem, ProfileRow, StudentRow } from '../../../supabase/functions/generate-invoice/types';

const STUDENT_ONE = '11111111-1111-1111-1111-111111111111';
const STUDENT_TWO = '22222222-2222-2222-2222-222222222222';
const MANDATE_ONE = '33333333-3333-3333-3333-333333333333';
const MANDATE_TWO = '44444444-4444-4444-4444-444444444444';

const batchItems: BatchItem[] = [
	{
		id: 'item-1',
		student_user_id: STUDENT_ONE,
		amount_cents: 1000,
		remittance_info: 'Les 1',
		lesson_agreement_id: 'agr-1',
		mandate_id: MANDATE_ONE,
	},
	{
		id: 'item-2',
		student_user_id: STUDENT_ONE,
		amount_cents: 1200,
		remittance_info: 'Les 2',
		lesson_agreement_id: 'agr-2',
		mandate_id: MANDATE_ONE,
	},
	{
		id: 'item-3',
		student_user_id: STUDENT_TWO,
		amount_cents: 900,
		remittance_info: 'Les 3',
		lesson_agreement_id: 'agr-3',
		mandate_id: MANDATE_TWO,
	},
];

describe('collectUniqueStudentIds', () => {
	it('returns unique student user ids', () => {
		expect(collectUniqueStudentIds(batchItems)).toEqual([STUDENT_ONE, STUDENT_TWO]);
	});
});

describe('extractMandateIds', () => {
	it('returns mandate ids in batch item order', () => {
		expect(extractMandateIds(batchItems)).toEqual([MANDATE_ONE, MANDATE_ONE, MANDATE_TWO]);
	});
});

describe('buildProfileMap', () => {
	it('maps profiles by user id', () => {
		const profiles: ProfileRow[] = [
			{ user_id: STUDENT_ONE, first_name: 'Anna', last_name: 'Bakker', email: 'anna@example.com' },
		];
		expect(buildProfileMap(profiles).get(STUDENT_ONE)).toEqual(profiles[0]);
	});
});

describe('buildStudentMap', () => {
	it('maps students by user id', () => {
		const students: StudentRow[] = [
			{
				user_id: STUDENT_ONE,
				date_of_birth: '2010-01-01',
				parent_email: null,
				parent_name: null,
				debtor_info_same_as_student: true,
				debtor_name: null,
				debtor_address: null,
				debtor_postal_code: null,
				debtor_city: null,
			},
		];
		expect(buildStudentMap(students).get(STUDENT_ONE)).toEqual(students[0]);
	});
});

describe('buildMandateMap', () => {
	it('maps mandate references by mandate id', () => {
		expect(
			buildMandateMap([
				{ id: MANDATE_ONE, mandate_reference: 'MND-001' },
				{ id: MANDATE_TWO, mandate_reference: 'MND-002' },
			]).get(MANDATE_TWO),
		).toBe('MND-002');
	});
});

describe('hasBatchItems', () => {
	it('returns true when batch items exist', () => {
		expect(hasBatchItems(batchItems)).toBe(true);
	});

	it('returns false for empty or missing item lists', () => {
		expect(hasBatchItems([])).toBe(false);
		expect(hasBatchItems(null)).toBe(false);
	});
});

describe('parseVatSettingsFromAppSetting', () => {
	const fallback = { ageThresholdYears: 21, standardRatePercent: 21 };

	it('parses a valid vat app_settings value', () => {
		expect(parseVatSettingsFromAppSetting({ age_threshold_years: 18, standard_rate_percent: 9 }, fallback)).toEqual(
			{ ageThresholdYears: 18, standardRatePercent: 9 },
		);
	});

	it('falls back when the value is missing or out of range', () => {
		expect(parseVatSettingsFromAppSetting(null, fallback)).toEqual(fallback);
		expect(parseVatSettingsFromAppSetting({ age_threshold_years: 0, standard_rate_percent: 21 }, fallback)).toEqual(
			fallback,
		);
	});
});

describe('buildBatchContextFromLoadedData', () => {
	it('builds batch context maps from loaded data', () => {
		const profiles: ProfileRow[] = [
			{ user_id: STUDENT_ONE, first_name: 'Anna', last_name: 'Bakker', email: 'anna@example.com' },
		];
		const students: StudentRow[] = [
			{
				user_id: STUDENT_ONE,
				date_of_birth: '2010-01-01',
				parent_email: null,
				parent_name: null,
				debtor_info_same_as_student: true,
				debtor_name: null,
				debtor_address: null,
				debtor_postal_code: null,
				debtor_city: null,
			},
		];

		expect(
			buildBatchContextFromLoadedData({
				settings: { company_name: 'PopSchool' },
				vat: { ageThresholdYears: 21, standardRatePercent: 21 },
				batch: { collection_date: '2026-09-01' },
				items: batchItems,
				profiles,
				students,
				mandates: [{ id: MANDATE_ONE, mandate_reference: 'MND-001' }],
			}).studentIds,
		).toEqual([STUDENT_ONE, STUDENT_TWO]);
	});
});
