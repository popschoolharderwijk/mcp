import { describe, expect, it } from 'bun:test';
import { DEFAULT_IMPORT_SETTINGS, parseImportSettings, passesMinAgreementEndDate } from './importSettingsHelpers';

describe('parseImportSettings', () => {
	it('accepts defaults and null minAgreementEndDate', () => {
		expect(parseImportSettings({})).toEqual({
			ok: true,
			value: DEFAULT_IMPORT_SETTINGS,
		});
		expect(parseImportSettings({ minAgreementEndDate: null, removeOutdatedStudents: true })).toEqual({
			ok: true,
			value: {
				minAgreementEndDate: null,
				removeOutdatedStudents: true,
				useLessonTypeAliases: false,
				lessonTypeAliases: {},
			},
		});
	});

	it('normalizes a valid minAgreementEndDate', () => {
		expect(parseImportSettings({ minAgreementEndDate: '2024-08-01' })).toEqual({
			ok: true,
			value: {
				minAgreementEndDate: '2024-08-01',
				removeOutdatedStudents: false,
				useLessonTypeAliases: false,
				lessonTypeAliases: {},
			},
		});
	});

	it('rejects invalid shapes and dates', () => {
		expect(parseImportSettings(null).ok).toBe(false);
		expect(parseImportSettings([]).ok).toBe(false);
		expect(parseImportSettings({ minAgreementEndDate: '01-08-2024' }).ok).toBe(false);
		expect(parseImportSettings({ minAgreementEndDate: '2024-13-01' }).ok).toBe(false);
		expect(parseImportSettings({ removeOutdatedStudents: 'yes' }).ok).toBe(false);
		expect(parseImportSettings({ useLessonTypeAliases: 'yes' }).ok).toBe(false);
		expect(parseImportSettings({ useLessonTypeAliases: true })).toEqual({
			ok: true,
			value: {
				minAgreementEndDate: null,
				removeOutdatedStudents: false,
				useLessonTypeAliases: true,
				lessonTypeAliases: {},
			},
		});
	});
});

describe('passesMinAgreementEndDate', () => {
	it('keeps all rows when no cutoff is set', () => {
		expect(passesMinAgreementEndDate(null, null)).toBe(true);
		expect(passesMinAgreementEndDate('2020-01-01', null)).toBe(true);
	});

	it('keeps open-ended and on-or-after cutoff ends', () => {
		expect(passesMinAgreementEndDate(null, '2024-01-01')).toBe(true);
		expect(passesMinAgreementEndDate('2024-01-01', '2024-01-01')).toBe(true);
		expect(passesMinAgreementEndDate('2025-06-01', '2024-01-01')).toBe(true);
		expect(passesMinAgreementEndDate('2023-12-31', '2024-01-01')).toBe(false);
	});
});
