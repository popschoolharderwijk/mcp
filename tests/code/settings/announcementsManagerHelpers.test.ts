import { describe, expect, it } from 'bun:test';
import {
	audienceFromFormFlags,
	audienceLabel,
	buildAnnouncementImagePath,
	buildAnnouncementSavePayload,
	isAnnouncementFormValid,
	isAnnouncementImageFile,
} from '../../../src/lib/settings/announcementsManagerHelpers';
describe('audienceLabel', () => {
	it('joins audience labels', () => {
		expect(audienceLabel(['teachers', 'students'])).toBe('Docenten + Leerlingen');
	});
});

describe('audienceFromFormFlags', () => {
	it('maps checkbox flags to audience array', () => {
		expect(audienceFromFormFlags({ audienceTeachers: true, audienceStudents: false })).toEqual(['teachers']);
	});
});

describe('buildAnnouncementSavePayload', () => {
	it('sets published_at when publish is enabled', () => {
		expect(
			buildAnnouncementSavePayload({
				title: 'Nieuws',
				body: 'Tekst',
				audience: ['teachers'],
				publish: true,
				existingPublishedAt: '2026-01-01T00:00:00.000Z',
			}),
		).toEqual({
			title: 'Nieuws',
			body: 'Tekst',
			audience: ['teachers'],
			published_at: '2026-01-01T00:00:00.000Z',
		});
	});
});

describe('isAnnouncementFormValid', () => {
	it('requires title and audience', () => {
		expect(isAnnouncementFormValid('Titel', ['students'])).toBe(true);
		expect(isAnnouncementFormValid(' ', ['students'])).toBe(false);
	});
});

describe('isAnnouncementImageFile', () => {
	it('accepts image mime types', () => {
		expect(isAnnouncementImageFile({ type: 'image/png' } as File)).toBe(true);
	});
});

describe('buildAnnouncementImagePath', () => {
	it('uses file extension', () => {
		expect(buildAnnouncementImagePath('photo.JPG')).toMatch(/\.jpg$/);
	});
});
