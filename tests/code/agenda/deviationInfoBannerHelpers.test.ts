import { describe, expect, it } from 'bun:test';
import {
	getDeviationBannerOriginalDescription,
	getDeviationBannerPresentation,
} from '../../../src/lib/agenda/deviationInfoBannerHelpers';

describe('getDeviationBannerPresentation', () => {
	it('returns cancelled styling for cancelled deviations', () => {
		expect(getDeviationBannerPresentation(true)).toEqual({
			containerClassName: 'bg-red-500/10 text-red-600 dark:text-red-400',
			title: 'Afspraak vervallen',
			buttonClassName:
				'text-red-600 hover:text-red-700 hover:bg-red-500/20 dark:text-red-400 dark:hover:text-red-300',
		});
	});

	it('returns warning styling for rescheduled deviations', () => {
		expect(getDeviationBannerPresentation(false)).toEqual({
			containerClassName: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
			title: 'Afwijkende afspraak',
			buttonClassName:
				'text-amber-600 hover:text-amber-700 hover:bg-amber-500/20 dark:text-amber-400 dark:hover:text-amber-300',
		});
	});
});

describe('getDeviationBannerOriginalDescription', () => {
	it('formats the original date and time', () => {
		expect(
			getDeviationBannerOriginalDescription({
				originalDate: '2026-10-12',
				originalStartTime: '14:30:00',
			}),
		).toBe('Origineel: maandag 12 oktober om 14:30');
	});

	it('mentions how many separate lessons the merge came from', () => {
		expect(
			getDeviationBannerOriginalDescription({
				originalDate: '2026-10-12',
				originalStartTime: '14:30:00',
				originalSeparateLessonCount: 2,
			}),
		).toBe('Origineel: 2 losse lessen (o.a. maandag 12 oktober om 14:30)');
	});
});
