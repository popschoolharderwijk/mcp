import type { SlotWithStatus } from '@/lib/agreementSlots';
import { formatDbDateToUi } from '@/lib/date/date-format';
import { formatTime } from '@/lib/time/time-format';
import type { WizardInitialAgreement } from '@/types/lesson-agreements';

export function formatWizardPeriodRange(start: string, end: string | null | undefined): string {
	return `${formatDbDateToUi(start)} t/m ${end?.trim() ? formatDbDateToUi(end) : '-'}`;
}

export function isWizardPeriodChanged(
	currentStart: string,
	currentEnd: string | null | undefined,
	nextStart: string,
	nextEnd: string,
): boolean {
	return currentStart !== nextStart || (currentEnd ?? '') !== nextEnd;
}

export function isWizardTeacherChanged(
	currentTeacherUserId: string | null | undefined,
	nextTeacherUserId: string | null,
): boolean {
	return currentTeacherUserId !== nextTeacherUserId;
}

export function isWizardSlotChanged(
	initialAgreement: WizardInitialAgreement,
	effectiveSlot: SlotWithStatus | null,
): boolean {
	return (
		initialAgreement.day_of_week !== effectiveSlot?.day_of_week ||
		formatTime(initialAgreement.start_time) !== (effectiveSlot ? formatTime(effectiveSlot.start_time) : '')
	);
}
