import { describe, expect, it } from 'bun:test';
import type { ScheduleFrequencyEntry } from '../courses/types';
import { buildImportCutoffRemovals, formatImportCutoffRemovalLog } from './importCutoffRemovalHelpers';
import type { ImportSettings } from './importSettingsHelpers';

const WEEKLY_30: ScheduleFrequencyEntry = { durationMinutes: 30, frequency: 'weekly' };

function scheduleMap(): Map<string, ScheduleFrequencyEntry> {
	return new Map([['df-1', WEEKLY_30]]);
}

function agreementDoc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		_id: { $oid: 'agreement-old' },
		student: { $oid: 'student-old' },
		teacher: { $oid: 'teacher-1' },
		course: { $oid: 'course-1' },
		durationfreq: { $oid: 'df-1' },
		agreementnumber: 'AGR-1001',
		startdate: '2024-01-01',
		enddate: '2024-01-31',
		schedule: [{ startdatetime: '2024-01-02T18:00:00Z' }],
		autorenewal: true,
		...overrides,
	};
}

function settings(overrides: Partial<ImportSettings> = {}): ImportSettings {
	return {
		minAgreementEndDate: '2024-06-01',
		removeOutdatedStudents: true,
		useLessonTypeAliases: false,
		lessonTypeAliases: {},
		...overrides,
	};
}

describe('buildImportCutoffRemovals', () => {
	it('lists dropped agreements and students with short labels', () => {
		const agreementDocs = [
			agreementDoc(),
			agreementDoc({
				_id: { $oid: 'agreement-kept' },
				student: { $oid: 'student-kept' },
				agreementnumber: 'AGR-2002',
				enddate: '2025-01-01',
			}),
		];
		const studentDocs = [
			{ _id: { $oid: 'student-old' }, name: 'Old', surname: 'Student', email: 'old@example.com' },
			{ _id: { $oid: 'student-kept' }, name: 'Kept', surname: 'Student', email: 'kept@example.com' },
			{ _id: { $oid: 'student-orphan' }, name: 'Orphan', surname: 'Student' },
		];
		const keptStudentOids = new Set(['student-kept']);

		const removals = buildImportCutoffRemovals({
			settings: settings(),
			agreementDocs,
			studentDocs,
			scheduleFrequencyMap: scheduleMap(),
			keptStudentOids,
		});

		expect(removals.agreements).toEqual([{ oid: 'agreement-old', label: 'AGR-1001' }]);
		expect(removals.students).toEqual([
			{ oid: 'student-old', label: 'old@example.com' },
			{ oid: 'student-orphan', label: 'Orphan Student' },
		]);
	});

	it('uses the agreement oid as label when agreementnumber is missing', () => {
		const removals = buildImportCutoffRemovals({
			settings: settings(),
			agreementDocs: [agreementDoc({ agreementnumber: '' })],
			studentDocs: [{ _id: { $oid: 'student-old' }, name: 'Old', surname: 'Student' }],
			scheduleFrequencyMap: scheduleMap(),
			keptStudentOids: new Set(),
		});

		expect(removals.agreements).toEqual([{ oid: 'agreement-old', label: 'agreement-old' }]);
	});
});

describe('formatImportCutoffRemovalLog', () => {
	it('formats cutoff removals as info log body', () => {
		const log = formatImportCutoffRemovalLog(settings(), {
			agreements: [{ oid: 'agreement-old', label: 'AGR-1001' }],
			students: [{ oid: '2343abed12', label: 'maartijn@gmail.co' }],
		});

		expect(log).toEqual({
			error: null,
			warning: null,
			info: ['INFO: skipped AGR-1001 (agreement-old)', 'INFO: skipped maartijn@gmail.co (2343abed12)', ''].join(
				'\n',
			),
		});
	});
});
