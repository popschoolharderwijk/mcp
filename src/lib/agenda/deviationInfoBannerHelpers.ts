import { formatDbDateLong } from '@/lib/date/date-format';
import { formatTime } from '@/lib/time/time-format';

export interface DeviationBannerPresentation {
	containerClassName: string;
	title: string;
	buttonClassName: string;
}

export function getDeviationBannerPresentation(isCancelled: boolean): DeviationBannerPresentation {
	if (isCancelled) {
		return {
			containerClassName: 'bg-red-500/10 text-red-600 dark:text-red-400',
			title: 'Afspraak vervallen',
			buttonClassName:
				'text-red-600 hover:text-red-700 hover:bg-red-500/20 dark:text-red-400 dark:hover:text-red-300',
		};
	}

	return {
		containerClassName: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
		title: 'Afwijkende afspraak',
		buttonClassName:
			'text-amber-600 hover:text-amber-700 hover:bg-amber-500/20 dark:text-amber-400 dark:hover:text-amber-300',
	};
}

export function getDeviationBannerOriginalDescription(params: {
	originalDate: string;
	originalStartTime: string;
	originalSeparateLessonCount?: number;
}): string {
	const when = `${formatDbDateLong(params.originalDate)} om ${formatTime(params.originalStartTime)}`;
	const count = params.originalSeparateLessonCount;
	if (count && count > 1) {
		return `Origineel: ${count} losse lessen (o.a. ${when})`;
	}
	return `Origineel: ${when}`;
}
