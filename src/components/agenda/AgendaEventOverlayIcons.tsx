import { LuBan, LuRepeat, LuTriangleAlert } from 'react-icons/lu';
import { getCancellationBanTitle } from '@/lib/agenda/agendaEventDisplay';

interface AgendaEventOverlayIconsProps {
	isRecurring: boolean;
	isCancelled: boolean;
	isTeacherCancelled: boolean;
	hasTimeOrDateChange: boolean;
	iconColorClass: string;
}

function shouldShowChangedOverlayIcon(isCancelled: boolean, hasTimeOrDateChange: boolean): boolean {
	return hasTimeOrDateChange && !isCancelled;
}

function getCancelledOverlayIconClass(isTeacherCancelled: boolean, iconColorClass: string): string {
	return isTeacherCancelled ? 'text-orange-500' : iconColorClass;
}

export function AgendaEventOverlayIcons({
	isRecurring,
	isCancelled,
	isTeacherCancelled,
	hasTimeOrDateChange,
	iconColorClass,
}: AgendaEventOverlayIconsProps) {
	return (
		<>
			{isRecurring && (
				<LuRepeat
					className={`absolute bottom-0.5 right-0.5 h-3 w-3 ${iconColorClass} drop-shadow-md z-10 shrink-0`}
					title="Terugkerende afspraak"
					aria-hidden
				/>
			)}
			{isCancelled && (
				<LuBan
					className={`absolute h-3 w-3 ${getCancelledOverlayIconClass(isTeacherCancelled, iconColorClass)} drop-shadow-md z-10 shrink-0 top-0.5 right-0.5`}
					title={getCancellationBanTitle(isTeacherCancelled)}
				/>
			)}
			{shouldShowChangedOverlayIcon(isCancelled, hasTimeOrDateChange) && (
				<LuTriangleAlert
					className={`absolute h-3 w-3 ${iconColorClass} drop-shadow-md z-10 shrink-0 top-0.5 right-0.5`}
					title="Gewijzigde afspraak"
				/>
			)}
		</>
	);
}
