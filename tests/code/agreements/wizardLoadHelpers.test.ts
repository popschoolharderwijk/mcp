import { describe, expect, it } from 'bun:test';
import { WizardStep } from '../../../src/components/agreements/WizardStepIndicator';
import type { RawAgreementRow } from '../../../src/lib/agreements/mapAgreementTableRow';
import {
	getTeacherUserIdFromJoin,
	mapLoadedAgreementRow,
	shouldLoadTeacherSlots,
	shouldLoadTeachers,
} from '../../../src/lib/agreements/wizardLoadHelpers';

function rawAgreement(overrides: Partial<RawAgreementRow> = {}): RawAgreementRow {
	return {
		id: 'agr-1',
		created_at: '2026-01-01T00:00:00Z',
		day_of_week: 1,
		start_time: '09:00:00',
		start_date: '2026-09-01',
		end_date: '2027-07-31',
		is_active: true,
		notes: null,
		student_user_id: 'stu-1',
		teacher_user_id: 'tea-1',
		lesson_type_id: 'lt-1',
		duration_minutes: 60,
		frequency: 'weekly',
		price_per_lesson: 30,
		duo_pair_id: null,
		lesson_types: { id: 'lt-1', name: 'Piano', icon: 'piano', color: '#000000' },
		teachers: [{ user_id: 'tea-1' }],
		...overrides,
	};
}

describe('getTeacherUserIdFromJoin', () => {
	it('returns the user id from a single teacher join object', () => {
		expect(getTeacherUserIdFromJoin({ user_id: 'tea-1' })).toBe('tea-1');
	});

	it('returns the first user id from a teacher join array', () => {
		expect(getTeacherUserIdFromJoin([{ user_id: 'tea-1' }, { user_id: 'tea-2' }])).toBe('tea-1');
	});

	it('returns undefined when no teacher join is present', () => {
		expect(getTeacherUserIdFromJoin(null)).toBeUndefined();
		expect(getTeacherUserIdFromJoin([])).toBeUndefined();
	});
});

describe('mapLoadedAgreementRow', () => {
	it('maps raw agreement data with joined profiles', () => {
		const profileMap = new Map([
			['stu-1', { first_name: 'Jan', last_name: 'Jansen', email: 'jan@example.com', avatar_url: null }],
			['tea-1', { first_name: 'Piet', last_name: 'Docent', email: 'piet@example.com', avatar_url: null }],
		]);
		const result = mapLoadedAgreementRow(rawAgreement(), profileMap);
		expect(result).toEqual({
			id: 'agr-1',
			created_at: '2026-01-01T00:00:00Z',
			day_of_week: 1,
			start_time: '09:00:00',
			start_date: '2026-09-01',
			end_date: '2027-07-31',
			is_active: true,
			notes: null,
			student_user_id: 'stu-1',
			teacher_user_id: 'tea-1',
			lesson_type_id: 'lt-1',
			duration_minutes: 60,
			frequency: 'weekly',
			price_per_lesson: 30,
			duo_pair_id: null,
			student: { first_name: 'Jan', last_name: 'Jansen', email: 'jan@example.com', avatar_url: null },
			teacher: { first_name: 'Piet', last_name: 'Docent', email: 'piet@example.com', avatar_url: null },
			lesson_type: { id: 'lt-1', name: 'Piano', icon: 'piano', color: '#000000' },
		});
	});

	it('unwraps array lesson type joins', () => {
		const profileMap = new Map<
			string,
			{ first_name: string | null; last_name: string | null; email: string; avatar_url: string | null }
		>();
		const result = mapLoadedAgreementRow(
			rawAgreement({
				lesson_types: [{ id: 'lt-2', name: 'Gitaar', icon: 'guitar', color: '#ff0000' }],
			}),
			profileMap,
		);
		expect(result.lesson_type).toEqual({ id: 'lt-2', name: 'Gitaar', icon: 'guitar', color: '#ff0000' });
	});
});

describe('shouldLoadTeachers', () => {
	it('returns false on early wizard steps', () => {
		expect(shouldLoadTeachers(WizardStep.User, 'lt-1')).toBe(false);
		expect(shouldLoadTeachers(WizardStep.Period, 'lt-1')).toBe(false);
	});

	it('returns false when no lesson type is selected', () => {
		expect(shouldLoadTeachers(WizardStep.Confirm, null)).toBe(false);
	});

	it('returns true once a lesson type is selected on later steps', () => {
		expect(shouldLoadTeachers(WizardStep.TeacherSlot, 'lt-1')).toBe(true);
	});
});

describe('shouldLoadTeacherSlots', () => {
	it('returns true when all teacher slot prerequisites are present', () => {
		expect(
			shouldLoadTeacherSlots(WizardStep.TeacherSlot, 'teacher-1', 'lt-1', '2026-09-01', '2027-07-31', {
				duration_minutes: 45,
				frequency: 'weekly',
			}),
		).toBe(true);
	});

	it('returns false when required slot data is missing', () => {
		expect(
			shouldLoadTeacherSlots(WizardStep.TeacherSlot, null, 'lt-1', '2026-09-01', '2027-07-31', {
				duration_minutes: 45,
				frequency: 'weekly',
			}),
		).toBe(false);
	});
});
