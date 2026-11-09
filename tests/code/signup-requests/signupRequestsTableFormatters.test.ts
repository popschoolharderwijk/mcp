import { describe, expect, it } from 'bun:test';
import {
	canScheduleTrialForSignupRequest,
	formatSignupTrialScheduledLine,
	getSignupLessonTypeCellContent,
	getSignupStatusDisplayLabel,
	isSignupRequestActionable,
} from '../../../src/lib/signup-requests/signupRequestsTableFormatters';

describe('getSignupLessonTypeCellContent', () => {
	it('builds group lesson cell content with group label', () => {
		expect(
			getSignupLessonTypeCellContent({
				lesson_type_name: 'Piano',
				lesson_group_name: 'Groep A',
				is_group_lesson: true,
				option_label: '45 min',
			} as never),
		).toEqual({
			lessonTypeName: 'Piano',
			groupLabel: 'Groep: Groep A',
			showWaitlistBadge: false,
			optionLabel: '45 min',
		});
	});

	it('shows waitlist badge for group lessons without a group', () => {
		expect(
			getSignupLessonTypeCellContent({
				lesson_type_name: 'Piano',
				lesson_group_name: null,
				is_group_lesson: true,
				option_label: null,
			} as never),
		).toEqual({
			lessonTypeName: 'Piano',
			groupLabel: null,
			showWaitlistBadge: true,
			optionLabel: null,
		});
	});

	it('returns minimal content for individual lessons', () => {
		expect(
			getSignupLessonTypeCellContent({
				lesson_type_name: 'Gitaar',
				lesson_group_name: null,
				is_group_lesson: false,
				option_label: null,
			} as never),
		).toEqual({
			lessonTypeName: 'Gitaar',
			groupLabel: null,
			showWaitlistBadge: false,
			optionLabel: null,
		});
	});
});

describe('getSignupStatusDisplayLabel', () => {
	it('maps trial scheduled status to Dutch label', () => {
		expect(getSignupStatusDisplayLabel('trial_scheduled')).toBe('proefles ingepland');
	});

	it('returns other statuses unchanged', () => {
		expect(getSignupStatusDisplayLabel('pending')).toBe('pending');
	});
});

describe('formatSignupTrialScheduledLine', () => {
	const formatDate = (date: string) => `DATE:${date}`;

	it('returns null when status is not trial scheduled', () => {
		expect(
			formatSignupTrialScheduledLine(
				{
					status: 'pending',
					trial_scheduled_date: '2026-03-01',
					trial_scheduled_time: null,
					trial_teacher_name: null,
				},
				formatDate,
			),
		).toBeNull();
	});

	it('formats date time and teacher parts', () => {
		expect(
			formatSignupTrialScheduledLine(
				{
					status: 'trial_scheduled',
					trial_scheduled_date: '2026-03-01',
					trial_scheduled_time: '14:30:00',
					trial_teacher_name: 'Jan Docent',
				},
				formatDate,
			),
		).toBe('DATE:2026-03-01 · 14:30 · Jan Docent');
	});
});

describe('signup request action visibility', () => {
	it('allows actions for pending and trial scheduled requests', () => {
		expect(isSignupRequestActionable('pending')).toBe(true);
		expect(isSignupRequestActionable('trial_scheduled')).toBe(true);
		expect(isSignupRequestActionable('approved')).toBe(false);
	});

	it('allows trial scheduling only for pending requests', () => {
		expect(canScheduleTrialForSignupRequest('pending')).toBe(true);
		expect(canScheduleTrialForSignupRequest('trial_scheduled')).toBe(false);
	});
});
