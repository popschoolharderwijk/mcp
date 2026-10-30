import { describe, expect, it } from 'bun:test';
import type { ScheduleFrequencyEntry } from '../courses/types';
import { agreementDocPassesCutoff, collectStudentOidsWithKeptAgreements } from './agreementCutoffHelpers';
import type { ImportSettings } from './importSettingsHelpers';

const WEEKLY_30: ScheduleFrequencyEntry = { durationMinutes: 30, frequency: 'weekly' };

function scheduleMap(): Map<string, ScheduleFrequencyEntry> {
	return new Map([['df-1', WEEKLY_30]]);
}

function agreementDoc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		_id: { $oid: 'agreement-1' },
		student: { $oid: 'student-1' },
		teacher: { $oid: 'teacher-1' },
		course: { $oid: 'course-1' },
		durationfreq: { $oid: 'df-1' },
		startdate: '2024-01-01',
		schedule: [{ startdatetime: '2024-01-02T18:00:00Z' }],
		autorenewal: true,
		...overrides,
	};
}

describe('agreementDocPassesCutoff', () => {
	it('keeps every doc when minAgreementEndDate is null', () => {
		const settings: ImportSettings = {
			minAgreementEndDate: null,
			removeOutdatedStudents: false,
			useLessonTypeAliases: false,
			lessonTypeAliases: {},
		};
		expect(agreementDocPassesCutoff(agreementDoc({ enddate: '2020-01-01' }), settings, scheduleMap())).toBe(true);
	});

	it('drops agreements that end before the cutoff and keeps open or later ends', () => {
		const settings: ImportSettings = {
			minAgreementEndDate: '2024-06-01',
			removeOutdatedStudents: false,
			useLessonTypeAliases: false,
			lessonTypeAliases: {},
		};
		const map = scheduleMap();
		expect(agreementDocPassesCutoff(agreementDoc({ enddate: '2024-05-31' }), settings, map)).toBe(false);
		expect(agreementDocPassesCutoff(agreementDoc({ enddate: '2024-06-01' }), settings, map)).toBe(true);
		expect(agreementDocPassesCutoff(agreementDoc({ enddate: undefined }), settings, map)).toBe(true);
	});
});

describe('collectStudentOidsWithKeptAgreements', () => {
	it('collects students only from agreements that pass the cutoff', () => {
		const settings: ImportSettings = {
			minAgreementEndDate: '2024-06-01',
			removeOutdatedStudents: true,
			useLessonTypeAliases: false,
			lessonTypeAliases: {},
		};
		const oids = collectStudentOidsWithKeptAgreements(
			[
				agreementDoc({
					_id: { $oid: 'a-old' },
					student: { $oid: 'student-old' },
					enddate: '2024-01-01',
				}),
				agreementDoc({
					_id: { $oid: 'a-new' },
					student: { $oid: 'student-new' },
					enddate: '2025-01-01',
				}),
				agreementDoc({
					_id: { $oid: 'a-open' },
					student: { $oid: 'student-open' },
					enddate: undefined,
				}),
			],
			settings,
			scheduleMap(),
		);
		expect([...oids].sort()).toEqual(['student-new', 'student-open']);
	});
});
