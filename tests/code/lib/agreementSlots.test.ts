import { describe, expect, it } from 'bun:test';
import {
	type AvailabilitySlot,
	type ExistingAgreementForSlot,
	type ExistingTrialLessonForSlot,
	getFreeSlotsAcrossTeachers,
	getSlotStatuses,
} from '../../../src/lib/agreementSlots';

const mondayAvail: AvailabilitySlot[] = [{ day_of_week: 1, start_time: '09:00', end_time: '11:00' }];

describe('getSlotStatuses', () => {
	it('copies the availability room name onto each lesson slot', () => {
		const periodStart = new Date('2026-09-07T12:00:00');
		const periodEnd = new Date('2026-09-28T12:00:00');
		const availability: AvailabilitySlot[] = [
			{ day_of_week: 1, start_time: '09:00', end_time: '11:00', room_name: 'Studio' },
		];
		const result = getSlotStatuses(periodStart, periodEnd, availability, [], 60, 'weekly');
		const nine = result.find((slot) => slot.start_time === '09:00');
		const ten = result.find((slot) => slot.start_time === '10:00');
		expect(nine?.roomName).toBe('Studio');
		expect(ten?.roomName).toBe('Studio');
	});

	it('leaves the lesson slot room empty when the availability window has none', () => {
		const periodStart = new Date('2026-09-07T12:00:00');
		const periodEnd = new Date('2026-09-28T12:00:00');
		const result = getSlotStatuses(periodStart, periodEnd, mondayAvail, [], 60, 'weekly');
		const nine = result.find((slot) => slot.start_time === '09:00');
		expect(nine?.roomName).toBeNull();
	});

	it('marks slots free when there are no agreements', () => {
		const periodStart = new Date('2026-09-07T12:00:00');
		const periodEnd = new Date('2026-09-28T12:00:00');
		const result = getSlotStatuses(periodStart, periodEnd, mondayAvail, [], 60, 'weekly');
		expect(result.length).toBe(2);
		expect(result[0]?.status).toBe('free');
		expect(result[0]?.occupiedOccurrences).toBe(0);
		expect(result[1]?.status).toBe('free');
	});

	it('marks a slot occupied when every weekly occurrence overlaps an agreement', () => {
		const periodStart = new Date('2026-09-07T12:00:00');
		const periodEnd = new Date('2026-09-21T12:00:00');
		const agreements: ExistingAgreementForSlot[] = [
			{
				day_of_week: 1,
				start_time: '09:00',
				start_date: '2026-09-01',
				end_date: '2026-12-01',
				frequency: 'weekly',
				duration_minutes: 60,
			},
		];
		const result = getSlotStatuses(periodStart, periodEnd, mondayAvail, agreements, 60, 'weekly');
		const nine = result.find((s) => s.start_time === '09:00');
		expect(nine?.status).toBe('occupied');
		expect(nine?.occupiedOccurrences).toBe(nine?.totalOccurrences);
	});

	it('marks a slot partial when only some occurrences overlap', () => {
		const periodStart = new Date('2026-09-07T12:00:00');
		const periodEnd = new Date('2026-09-28T12:00:00');
		const agreements: ExistingAgreementForSlot[] = [
			{
				day_of_week: 1,
				start_time: '09:00',
				start_date: '2026-09-07',
				end_date: '2026-09-14',
				frequency: 'weekly',
				duration_minutes: 60,
			},
		];
		const result = getSlotStatuses(periodStart, periodEnd, mondayAvail, agreements, 60, 'weekly');
		const nine = result.find((s) => s.start_time === '09:00');
		expect(nine?.status).toBe('partial');
		expect(nine?.occupiedOccurrences).toBe(2);
		expect(nine?.totalOccurrences).toBe(4);
	});

	it('handles biweekly agreement occurrence matching', () => {
		const periodStart = new Date('2026-09-07T12:00:00');
		const periodEnd = new Date('2026-09-21T12:00:00');
		const agreements: ExistingAgreementForSlot[] = [
			{
				day_of_week: 1,
				start_time: '09:00',
				start_date: '2026-09-07',
				end_date: '2026-12-01',
				frequency: 'biweekly',
				duration_minutes: 60,
			},
		];
		const result = getSlotStatuses(periodStart, periodEnd, mondayAvail, agreements, 60, 'weekly');
		const nine = result.find((s) => s.start_time === '09:00');
		expect(nine?.occupiedOccurrences).toBe(3);
		expect(nine?.totalOccurrences).toBe(3);
		expect(nine?.status).toBe('occupied');
	});
});

describe('getFreeSlotsAcrossTeachers', () => {
	it('returns free slots sorted by date, time, and teacher', () => {
		const periodStart = new Date('2026-09-07T12:00:00');
		const periodEnd = new Date('2026-09-07T12:00:00');
		const availabilityByTeacher = new Map<string, AvailabilitySlot[]>([
			['teacher-b', mondayAvail],
			['teacher-a', mondayAvail],
		]);
		const result = getFreeSlotsAcrossTeachers(
			periodStart,
			periodEnd,
			availabilityByTeacher,
			new Map(),
			new Map(),
			60,
		);
		expect(result).toHaveLength(4);
		expect(result[0]?.teacher_user_id).toBe('teacher-a');
		expect(result[0]?.start_time).toBe('09:00');
		expect(result[1]?.teacher_user_id).toBe('teacher-b');
		expect(result[1]?.start_time).toBe('09:00');
		expect(result[2]?.teacher_user_id).toBe('teacher-a');
		expect(result[2]?.start_time).toBe('10:00');
		expect(result[3]?.teacher_user_id).toBe('teacher-b');
	});

	it('excludes slots that overlap an agreement occurrence', () => {
		const periodStart = new Date('2026-09-07T12:00:00');
		const periodEnd = new Date('2026-09-07T12:00:00');
		const availabilityByTeacher = new Map([['t1', mondayAvail]]);
		const agreementsByTeacher = new Map<string, ExistingAgreementForSlot[]>([
			[
				't1',
				[
					{
						day_of_week: 1,
						start_time: '09:00',
						start_date: '2026-09-01',
						end_date: null,
						frequency: 'weekly',
						duration_minutes: 60,
					},
				],
			],
		]);
		const result = getFreeSlotsAcrossTeachers(
			periodStart,
			periodEnd,
			availabilityByTeacher,
			agreementsByTeacher,
			new Map(),
			60,
		);
		expect(result).toHaveLength(1);
		expect(result[0]?.start_time).toBe('10:00');
	});

	it('excludes slots that overlap a trial lesson', () => {
		const periodStart = new Date('2026-09-07T12:00:00');
		const periodEnd = new Date('2026-09-07T12:00:00');
		const availabilityByTeacher = new Map([['t1', mondayAvail]]);
		const trialsByTeacher = new Map<string, ExistingTrialLessonForSlot[]>([
			[
				't1',
				[
					{
						teacher_user_id: 't1',
						scheduled_date: '2026-09-07',
						scheduled_start_time: '10:00',
						duration_minutes: 60,
					},
				],
			],
		]);
		const result = getFreeSlotsAcrossTeachers(
			periodStart,
			periodEnd,
			availabilityByTeacher,
			new Map(),
			trialsByTeacher,
			60,
		);
		expect(result).toHaveLength(1);
		expect(result[0]?.start_time).toBe('09:00');
	});

	it('skips teachers with no availability on that weekday', () => {
		const periodStart = new Date('2026-09-07T12:00:00');
		const periodEnd = new Date('2026-09-07T12:00:00');
		const tuesdayOnly: AvailabilitySlot[] = [{ day_of_week: 2, start_time: '09:00', end_time: '10:00' }];
		const result = getFreeSlotsAcrossTeachers(
			periodStart,
			periodEnd,
			new Map([['t1', tuesdayOnly]]),
			new Map(),
			new Map(),
			60,
		);
		expect(result).toHaveLength(0);
	});
});
