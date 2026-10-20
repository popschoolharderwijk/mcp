import { describe, expect, it } from 'bun:test';
import {
	formatLessonGroupPeriodText,
	formatLessonGroupScheduleText,
	resolveLessonGroupMembersDisplay,
	resolveLessonGroupNameDisplay,
	resolveLessonGroupTeacherProfile,
} from '../../../src/lib/lesson-groups/lessonGroupConfirmStepHelpers';

describe('formatLessonGroupScheduleText', () => {
	it('returns a dash when slot is missing', () => {
		expect(formatLessonGroupScheduleText(null, 45, 'weekly')).toBe('-');
	});

	it('formats the schedule text when slot is present', () => {
		expect(formatLessonGroupScheduleText({ day_of_week: 1, start_time: '14:30:00' }, 45, 'weekly')).toBe(
			'Maandag 14:30 · 45 min · Wekelijks',
		);
	});
});

describe('formatLessonGroupPeriodText', () => {
	it('formats open-ended periods', () => {
		expect(formatLessonGroupPeriodText('2026-09-01', null, (value) => `ui-${value}`)).toBe(
			'ui-2026-09-01 t/m Geen einde',
		);
	});

	it('formats bounded periods', () => {
		expect(formatLessonGroupPeriodText('2026-09-01', '2026-12-01', (value) => `ui-${value}`)).toBe(
			'ui-2026-09-01 t/m ui-2026-12-01',
		);
	});
});

describe('resolveLessonGroupMembersDisplay', () => {
	it('returns empty display for zero members', () => {
		expect(resolveLessonGroupMembersDisplay(0)).toEqual({
			kind: 'empty',
			label: 'Nog geen leerlingen',
		});
	});

	it('returns singular and plural member labels', () => {
		expect(resolveLessonGroupMembersDisplay(1)).toEqual({
			kind: 'single',
			label: '1 deelnemer',
		});
		expect(resolveLessonGroupMembersDisplay(3)).toEqual({
			kind: 'multiple',
			label: '3 deelnemers',
		});
	});
});

describe('resolveLessonGroupTeacherProfile', () => {
	it('returns null when teacher is missing', () => {
		expect(resolveLessonGroupTeacherProfile(undefined)).toBeNull();
	});

	it('maps teacher fields to profile shape', () => {
		expect(
			resolveLessonGroupTeacherProfile({
				firstName: 'Jan',
				lastName: 'Jansen',
				email: 'jan@example.com',
				avatarUrl: 'avatar.png',
			}),
		).toEqual({
			first_name: 'Jan',
			last_name: 'Jansen',
			email: 'jan@example.com',
			avatar_url: 'avatar.png',
		});
	});
});

describe('resolveLessonGroupNameDisplay', () => {
	it('returns dash for blank names', () => {
		expect(resolveLessonGroupNameDisplay('   ')).toBe('-');
	});

	it('returns trimmed names', () => {
		expect(resolveLessonGroupNameDisplay('  Groep A  ')).toBe('Groep A');
	});
});
