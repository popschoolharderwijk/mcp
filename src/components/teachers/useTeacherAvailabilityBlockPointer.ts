import { type PointerEvent as ReactPointerEvent, useRef, useState } from 'react';
import type { AgendaSetting } from '@/lib/settings/appSettingsTypes';
import {
	type AvailabilityBlock,
	type AvailabilityBlockPointerMode,
	type AvailabilityPointerEndAction,
	type AvailabilityTimeForm,
	availabilityGeometryFromTimes,
	canStartAvailabilityBlockPointer,
	computeAvailabilityBlockPointerPreview,
	resolveAvailabilityPointerEndAction,
	shouldShowAvailabilityBlockTimes,
} from '@/lib/teachers/teacherAvailabilitySectionHelpers';
import { formatTime } from '@/lib/time/time-format';

interface PointerSession {
	mode: AvailabilityBlockPointerMode;
	pointerId: number;
	startClientY: number;
	columnHeight: number;
	originStartTime: string;
	originEndTime: string;
}

function releasePointerCapture(event: ReactPointerEvent<HTMLElement>): void {
	if (event.currentTarget.hasPointerCapture(event.pointerId)) {
		event.currentTarget.releasePointerCapture(event.pointerId);
	}
}

export function useTeacherAvailabilityBlockPointer(params: {
	block: AvailabilityBlock;
	agenda: AgendaSetting;
	canEdit: boolean;
	buttonRef: React.RefObject<HTMLButtonElement | null>;
	onClick: (block: AvailabilityBlock) => void;
	onTimesCommit: (block: AvailabilityBlock, form: AvailabilityTimeForm) => boolean | Promise<boolean>;
}) {
	const { block, agenda, canEdit, buttonRef, onClick, onTimesCommit } = params;
	const sessionRef = useRef<PointerSession | null>(null);
	const previewRef = useRef<AvailabilityTimeForm | null>(null);
	const [preview, setPreview] = useState<AvailabilityTimeForm | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [isPendingSave, setIsPendingSave] = useState(false);

	const setPreviewTimes = (next: AvailabilityTimeForm | null) => {
		previewRef.current = next;
		setPreview(next);
	};

	const displayStart = preview?.start_time ?? block.startTime;
	const displayEnd = preview?.end_time ?? block.endTime;
	const geometry = availabilityGeometryFromTimes(displayStart, displayEnd, agenda);

	const applyPointerEndAction = (action: AvailabilityPointerEndAction) => {
		if (action.kind === 'click') {
			setPreviewTimes(null);
			onClick(block);
			return;
		}
		if (action.kind === 'commit') {
			setIsPendingSave(true);
			void Promise.resolve(onTimesCommit(block, action.form)).finally(() => {
				setPreviewTimes(null);
				setIsPendingSave(false);
			});
			return;
		}
		setPreviewTimes(null);
	};

	const beginPointerSession = (event: ReactPointerEvent<HTMLElement>, mode: AvailabilityBlockPointerMode) => {
		if (!canStartAvailabilityBlockPointer(canEdit, isPendingSave)) return;
		const columnEl = buttonRef.current?.offsetParent;
		if (!(columnEl instanceof HTMLElement)) return;

		event.preventDefault();
		event.stopPropagation();
		event.currentTarget.setPointerCapture(event.pointerId);

		sessionRef.current = {
			mode,
			pointerId: event.pointerId,
			startClientY: event.clientY,
			columnHeight: columnEl.getBoundingClientRect().height,
			originStartTime: block.startTime,
			originEndTime: block.endTime,
		};
		setIsDragging(true);
		setPreviewTimes({
			start_time: formatTime(block.startTime),
			end_time: formatTime(block.endTime),
		});
	};

	const updatePointerSession = (event: ReactPointerEvent<HTMLElement>) => {
		const session = sessionRef.current;
		if (!session || event.pointerId !== session.pointerId) return;

		const next = computeAvailabilityBlockPointerPreview({
			mode: session.mode,
			originStartTime: session.originStartTime,
			originEndTime: session.originEndTime,
			startClientY: session.startClientY,
			currentClientY: event.clientY,
			columnHeight: session.columnHeight,
			agenda,
		});
		if (next) setPreviewTimes(next);
	};

	const endPointerSession = (event: ReactPointerEvent<HTMLElement>) => {
		const session = sessionRef.current;
		if (!session || event.pointerId !== session.pointerId) return;

		releasePointerCapture(event);
		const action = resolveAvailabilityPointerEndAction({
			deltaYPx: event.clientY - session.startClientY,
			preview: previewRef.current,
			original: block,
		});
		sessionRef.current = null;
		setIsDragging(false);
		applyPointerEndAction(action);
	};

	return {
		isDragging,
		isPendingSave,
		geometry,
		startLabel: formatTime(displayStart),
		endLabel: formatTime(displayEnd),
		showTimes: shouldShowAvailabilityBlockTimes(displayStart, displayEnd),
		beginPointerSession,
		updatePointerSession,
		endPointerSession,
	};
}
