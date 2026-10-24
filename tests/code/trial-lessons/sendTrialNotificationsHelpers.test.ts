import { describe, expect, it } from 'bun:test';
import {
	buildTrialNotificationRecipient,
	buildTrialSharedVars,
	buildTrialTeacherName,
} from '../../../supabase/functions/schedule-trial-lesson/sendTrialNotificationsHelpers';

describe('buildTrialNotificationRecipient', () => {
	it('prefers parent email when available', () => {
		expect(buildTrialNotificationRecipient('Parent@Example.com', 'Student@Example.com')).toBe('parent@example.com');
	});

	it('falls back to student email', () => {
		expect(buildTrialNotificationRecipient(null, 'Student@Example.com')).toBe('student@example.com');
	});
});

describe('buildTrialSharedVars', () => {
	it('builds shared trial notification vars', () => {
		expect(
			buildTrialSharedVars({
				studentFirstName: 'Jan',
				studentLastName: 'Leerling',
				lessonTypeName: 'Piano',
				scheduledDate: '2026-09-01',
				scheduledStartTime: '15:30:00',
				durationMinutes: 45,
			}),
		).toEqual({
			leerling_naam: 'Jan Leerling',
			les_type: 'Piano',
			datum: '2026-09-01',
			tijd: '15:30',
			duur: '45',
		});
	});
});

describe('buildTrialTeacherName', () => {
	it('returns trimmed teacher name', () => {
		expect(buildTrialTeacherName('Anna', 'Docent')).toBe('Anna Docent');
	});

	it('returns docent fallback when name is empty', () => {
		expect(buildTrialTeacherName(null, null)).toBe('docent');
	});
});
