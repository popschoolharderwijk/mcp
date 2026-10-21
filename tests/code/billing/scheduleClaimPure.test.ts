import { describe, expect, it } from 'bun:test';
import {
	buildScheduleFromSubscriptionIdempotencyKey,
	buildScheduleIdempotencyKey,
	findDuplicateScheduleGroups,
	isOpenScheduleStatus,
	pickScheduleToKeep,
	selectAdoptableSchedule,
} from '../../../supabase/functions/_shared/scheduleClaimPure';

describe('buildScheduleIdempotencyKey', () => {
	it('is deterministic per agreement and first phase start', () => {
		expect(buildScheduleIdempotencyKey('agr-1', '2026-11-01')).toBe('mcp_schedule_agr-1_2026-11-01');
		expect(buildScheduleIdempotencyKey('agr-1', '2026-11-01')).toBe(
			buildScheduleIdempotencyKey('agr-1', '2026-11-01'),
		);
	});

	it('differs per agreement and per first phase start', () => {
		expect(buildScheduleIdempotencyKey('agr-1', '2026-11-01')).not.toBe(
			buildScheduleIdempotencyKey('agr-2', '2026-11-01'),
		);
		expect(buildScheduleIdempotencyKey('agr-1', '2026-11-01')).not.toBe(
			buildScheduleIdempotencyKey('agr-1', '2026-12-01'),
		);
	});

	it('builds a key for schedules created from a subscription', () => {
		expect(buildScheduleFromSubscriptionIdempotencyKey('sub_123')).toBe('mcp_schedule_from_sub_sub_123');
	});
});

describe('isOpenScheduleStatus', () => {
	it('treats canceled and completed as closed', () => {
		expect(isOpenScheduleStatus('canceled')).toBe(false);
		expect(isOpenScheduleStatus('completed')).toBe(false);
	});

	it('treats active and not_started as open', () => {
		expect(isOpenScheduleStatus('active')).toBe(true);
		expect(isOpenScheduleStatus('not_started')).toBe(true);
	});
});

describe('selectAdoptableSchedule', () => {
	const schedules = [
		{ id: 'sched_other', status: 'not_started', created: 100, metadata: { lesson_agreement_id: 'agr-other' } },
		{ id: 'sched_canceled', status: 'canceled', created: 50, metadata: { lesson_agreement_id: 'agr-1' } },
		{ id: 'sched_newer', status: 'not_started', created: 300, metadata: { lesson_agreement_id: 'agr-1' } },
		{ id: 'sched_oldest', status: 'active', created: 200, metadata: { lesson_agreement_id: 'agr-1' } },
	];

	it('adopts the oldest open schedule of the agreement', () => {
		expect(selectAdoptableSchedule(schedules, 'agr-1')?.id).toBe('sched_oldest');
	});

	it('ignores schedules of other agreements and canceled ones', () => {
		const only = [
			{ id: 'sched_other', status: 'active', created: 1, metadata: { lesson_agreement_id: 'agr-other' } },
			{ id: 'sched_canceled', status: 'canceled', created: 2, metadata: { lesson_agreement_id: 'agr-1' } },
		];
		expect(selectAdoptableSchedule(only, 'agr-1')).toBeNull();
	});
});

describe('findDuplicateScheduleGroups', () => {
	it('reports agreements with more than one open schedule, oldest first', () => {
		const groups = findDuplicateScheduleGroups([
			{ id: 'sched_b', status: 'not_started', created: 200, metadata: { lesson_agreement_id: 'agr-1' } },
			{ id: 'sched_a', status: 'not_started', created: 100, metadata: { lesson_agreement_id: 'agr-1' } },
			{ id: 'sched_c', status: 'canceled', created: 50, metadata: { lesson_agreement_id: 'agr-1' } },
			{ id: 'sched_d', status: 'active', created: 100, metadata: { lesson_agreement_id: 'agr-2' } },
		]);
		expect(groups).toEqual([{ agreementId: 'agr-1', scheduleIds: ['sched_a', 'sched_b'] }]);
	});

	it('ignores schedules without an agreement id', () => {
		expect(
			findDuplicateScheduleGroups([
				{ id: 'sched_x', status: 'active', created: 1 },
				{ id: 'sched_y', status: 'active', created: 2, metadata: {} },
			]),
		).toEqual([]);
	});
});

describe('pickScheduleToKeep', () => {
	it('keeps the schedule stored in the app when it is among the duplicates', () => {
		expect(pickScheduleToKeep(['sched_a', 'sched_b'], 'sched_b')).toBe('sched_b');
	});

	it('keeps the oldest when the stored schedule is missing or unknown', () => {
		expect(pickScheduleToKeep(['sched_a', 'sched_b'], null)).toBe('sched_a');
		expect(pickScheduleToKeep(['sched_a', 'sched_b'], 'sched_gone')).toBe('sched_a');
	});
});
