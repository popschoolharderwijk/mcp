import { describe, expect, it } from 'bun:test';
import {
	buildOptionLabelMap,
	buildTeacherNameMap,
	buildTrialMap,
	collectTeacherUserIds,
	collectUniqueOptionIds,
	enrichSignupRequestRow,
} from '../../../src/lib/signup-requests/signupRequestEnrichmentHelpers';
import type { SignupRequestRowBase } from '../../../src/lib/signup-requests/signupRequestsPageHelpers';

const baseRow = {
	id: 'req-1',
	first_name: 'Anna',
	last_name: 'Bakker',
	email: 'anna@example.com',
	phone_number: null,
	date_of_birth: null,
	parent_name: null,
	parent_email: null,
	parent_phone_number: null,
	notes: null,
	status: 'pending',
	created_at: '2026-01-01T00:00:00Z',
	processed_at: null,
	lesson_type_id: 'lt-1',
	lesson_group_id: null,
	lesson_type_option_id: 'opt-1',
	lesson_type_name: 'Piano',
	lesson_group_name: null,
	is_group_lesson: false,
	option_label: null,
	trial_scheduled_date: null,
	trial_scheduled_time: null,
	trial_teacher_name: null,
} as unknown as SignupRequestRowBase;

describe('collectUniqueOptionIds', () => {
	it('returns unique non-null option ids', () => {
		expect(
			collectUniqueOptionIds([
				{ ...baseRow, lesson_type_option_id: 'opt-1' },
				{ ...baseRow, id: 'req-2', lesson_type_option_id: 'opt-1' },
				{ ...baseRow, id: 'req-3', lesson_type_option_id: null },
			]),
		).toEqual(['opt-1']);
	});
});

describe('buildOptionLabelMap', () => {
	it('maps option ids to formatted labels', () => {
		const optionMap = buildOptionLabelMap([
			{ id: 'opt-1', duration_minutes: 45, frequency: 'weekly', price_per_lesson: 25 },
		]);
		expect(optionMap.get('opt-1')).toBe('45 min · weekly · €25');
	});
});

describe('buildTrialMap', () => {
	it('indexes trials by signup request id', () => {
		const trialMap = buildTrialMap([
			{
				signup_request_id: 'req-1',
				scheduled_date: '2026-09-15',
				scheduled_start_time: '14:00',
				teacher_user_id: 'tea-1',
			},
			{
				signup_request_id: null,
				scheduled_date: '2026-09-16',
				scheduled_start_time: '15:00',
				teacher_user_id: 'tea-2',
			},
		]);
		expect(trialMap.get('req-1')).toEqual({
			date: '2026-09-15',
			time: '14:00',
			teacher_user_id: 'tea-1',
		});
		expect(trialMap.size).toBe(1);
	});
});

describe('buildTeacherNameMap', () => {
	it('maps teacher user ids to display names', () => {
		const teacherNames = buildTeacherNameMap([{ user_id: 'tea-1', first_name: 'Piet', last_name: 'Docent' }]);
		expect(teacherNames.get('tea-1')).toBe('Piet Docent');
	});

	it('falls back to Docent when names are missing', () => {
		const teacherNames = buildTeacherNameMap([{ user_id: 'tea-2', first_name: null, last_name: null }]);
		expect(teacherNames.get('tea-2')).toBe('Docent');
	});
});

describe('collectTeacherUserIds', () => {
	it('returns unique teacher user ids from trial map values', () => {
		const trialMap = buildTrialMap([
			{
				signup_request_id: 'req-1',
				scheduled_date: '2026-09-15',
				scheduled_start_time: '14:00',
				teacher_user_id: 'tea-1',
			},
			{
				signup_request_id: 'req-2',
				scheduled_date: '2026-09-16',
				scheduled_start_time: '15:00',
				teacher_user_id: 'tea-1',
			},
		]);
		expect(collectTeacherUserIds(trialMap)).toEqual(['tea-1']);
	});
});

describe('enrichSignupRequestRow', () => {
	it('adds option label and trial teacher details', () => {
		const optionMap = new Map([['opt-1', '45 min · weekly · €25']]);
		const trialMap = new Map([['req-1', { date: '2026-09-15', time: '14:00', teacher_user_id: 'tea-1' }]]);
		const teacherNames = new Map([['tea-1', 'Piet Docent']]);

		expect(enrichSignupRequestRow(baseRow, optionMap, trialMap, teacherNames)).toEqual({
			...baseRow,
			option_label: '45 min · weekly · €25',
			trial_scheduled_date: '2026-09-15',
			trial_scheduled_time: '14:00',
			trial_teacher_name: 'Piet Docent',
		});
	});
});
