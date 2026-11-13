import { describe, expect, it } from 'bun:test';
import { signupRequestMatchesStatusFilter } from '../../../src/lib/signup-requests/signupRequestStatuses';
import {
	buildScheduleTrialSignupRequestPayload,
	buildSignupRequestStatusQuickFilter,
	resolveSignupRequestsPageGate,
} from '../../../src/lib/signup-requests/signupRequestsPageShellHelpers';

const signupRow = {
	id: 'req-1',
	first_name: 'Anna',
	last_name: 'Bakker',
	email: 'anna@example.com',
	lesson_type_id: 'lt-1',
	lesson_type_option_id: 'opt-1',
	status: 'pending' as const,
	created_at: '2026-01-01T00:00:00Z',
	updated_at: '2026-01-01T00:00:00Z',
	processed_at: null,
	processed_by: null,
	lesson_group_id: null,
	notes: null,
	phone_number: null,
	date_of_birth: null,
	parent_name: null,
	parent_email: null,
	parent_phone_number: null,
	lesson_type_name: 'Piano',
	lesson_group_name: null,
	is_group_lesson: false,
	option_label: null,
	trial_scheduled_date: null,
	trial_scheduled_time: null,
	trial_teacher_name: null,
};

describe('resolveSignupRequestsPageGate', () => {
	it('returns loading while auth is loading', () => {
		expect(resolveSignupRequestsPageGate(true, true)).toBe('loading');
	});

	it('returns denied for non-privileged users', () => {
		expect(resolveSignupRequestsPageGate(false, false)).toBe('denied');
	});

	it('returns ready for privileged users', () => {
		expect(resolveSignupRequestsPageGate(false, true)).toBe('ready');
	});
});

describe('buildSignupRequestStatusQuickFilter', () => {
	it('lists open plus every signup status with the shared Dutch labels', () => {
		const group = buildSignupRequestStatusQuickFilter('open', () => undefined);
		expect(group.label).toBe('Status');
		expect(group.value).toBe('open');
		expect(group.showAllOption).toBe(true);
		expect(group.allOptionLabel).toBe('Alle');
		expect(group.options.map((option) => option.label)).toEqual([
			'Open',
			'In afwachting',
			'Proefles ingepland',
			'Goedgekeurd',
			'Afgewezen',
		]);
	});
});

describe('signupRequestMatchesStatusFilter', () => {
	it('keeps every status when no filter is selected', () => {
		expect(signupRequestMatchesStatusFilter('approved', null)).toBe(true);
		expect(signupRequestMatchesStatusFilter('rejected', null)).toBe(true);
	});

	it('treats open as pending and trial scheduled', () => {
		expect(signupRequestMatchesStatusFilter('pending', 'open')).toBe(true);
		expect(signupRequestMatchesStatusFilter('trial_scheduled', 'open')).toBe(true);
		expect(signupRequestMatchesStatusFilter('approved', 'open')).toBe(false);
		expect(signupRequestMatchesStatusFilter('rejected', 'open')).toBe(false);
	});

	it('matches one status exactly', () => {
		expect(signupRequestMatchesStatusFilter('rejected', 'rejected')).toBe(true);
		expect(signupRequestMatchesStatusFilter('pending', 'rejected')).toBe(false);
	});
});

describe('buildScheduleTrialSignupRequestPayload', () => {
	it('maps signup row to dialog payload', () => {
		expect(buildScheduleTrialSignupRequestPayload(signupRow as never)).toEqual({
			id: 'req-1',
			first_name: 'Anna',
			last_name: 'Bakker',
			email: 'anna@example.com',
			lesson_type_id: 'lt-1',
			lesson_type_option_id: 'opt-1',
		});
	});

	it('returns null when no row is selected', () => {
		expect(buildScheduleTrialSignupRequestPayload(null)).toBeNull();
	});
});
