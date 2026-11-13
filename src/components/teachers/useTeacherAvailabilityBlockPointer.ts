import { type PointerEvent as ReactPointerEvent, useRef, useState } from 'react';
import type { AgendaSetting } from '@/lib/settings/appSettingsTypes';
import {
	type AvailabilityBlock,
	type AvailabilityBlockPointerMode,
	type AvailabilityPointerEndAction,
	type AvailabilityTimeForm,
	availabilityBlockDisplayTimes,
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

type PointerPreviewControls = {
	setPreviewTimes: (next: AvailabilityTimeForm | null) => void;
	setIsPendingSave: (next: boolean) => void;
	onClick: (block: AvailabilityBlock) => void;
	onTimesCommit: (block: AvailabilityBlock, form: AvailabilityTimeForm) => boolean | Promise<boolean>;
};

function releasePointerCapture(event: ReactPointerEvent<HTMLElement>): void {
	if (event.currentTarget.hasPointerCapture(event.pointerId)) {
		event.currentTarget.releasePointerCapture(event.pointerId);
	}
}

function applyPointerEndAction(
	action: AvailabilityPointerEndAction,
	block: AvailabilityBlock,
	controls: PointerPreviewControls,
): void {
	if (action.kind === 'click') {
		controls.setPreviewTimes(null);
		controls.onClick(block);
		return;
	}
	if (action.kind === 'commit') {
		controls.setIsPendingSave(true);
		void Promise.resolve(controls.onTimesCommit(block, { ...action.form, room_id: block.roomId })).finally(() => {
			controls.setPreviewTimes(null);
			controls.setIsPendingSave(false);
		});
		return;
	}
	controls.setPreviewTimes(null);
}

function beginPointerSession(params: {
	event: ReactPointerEvent<HTMLElement>;
	mode: AvailabilityBlockPointerMode;
	canEdit: boolean;
	isPendingSave: boolean;
	buttonRef: React.RefObject<HTMLButtonElement | null>;
	block: AvailabilityBlock;
	sessionRef: React.MutableRefObject<PointerSession | null>;
	setIsDragging: (next: boolean) => void;
	setPreviewTimes: (next: AvailabilityTimeForm | null) => void;
}): void {
	const { event, mode, canEdit, isPendingSave, buttonRef, block, sessionRef, setIsDragging, setPreviewTimes } =
		params;
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
		room_id: block.roomId,
	});
}

function updatePointerSession(params: {
	event: ReactPointerEvent<HTMLElement>;
	sessionRef: React.MutableRefObject<PointerSession | null>;
	agenda: AgendaSetting;
	blockRoomId: string | null;
	setPreviewTimes: (next: AvailabilityTimeForm | null) => void;
}): void {
	const { event, sessionRef, agenda, blockRoomId, setPreviewTimes } = params;
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
	if (next) setPreviewTimes({ ...next, room_id: blockRoomId });
}

function endPointerSession(params: {
	event: ReactPointerEvent<HTMLElement>;
	sessionRef: React.MutableRefObject<PointerSession | null>;
	previewRef: React.MutableRefObject<AvailabilityTimeForm | null>;
	block: AvailabilityBlock;
	setIsDragging: (next: boolean) => void;
	controls: PointerPreviewControls;
}): void {
	const { event, sessionRef, previewRef, block, setIsDragging, controls } = params;
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
	applyPointerEndAction(action, block, controls);
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

	const display = availabilityBlockDisplayTimes(preview, block);
	const controls: PointerPreviewControls = {
		setPreviewTimes,
		setIsPendingSave,
		onClick,
		onTimesCommit,
	};

	return {
		isDragging,
		isPendingSave,
		geometry: availabilityGeometryFromTimes(display.start, display.end, agenda),
		startLabel: formatTime(display.start),
		endLabel: formatTime(display.end),
		showTimes: shouldShowAvailabilityBlockTimes(display.start, display.end),
		showResizeHandles: canStartAvailabilityBlockPointer(canEdit, isPendingSave),
		beginPointerSession: (event: ReactPointerEvent<HTMLElement>, mode: AvailabilityBlockPointerMode) => {
			beginPointerSession({
				event,
				mode,
				canEdit,
				isPendingSave,
				buttonRef,
				block,
				sessionRef,
				setIsDragging,
				setPreviewTimes,
			});
		},
		updatePointerSession: (event: ReactPointerEvent<HTMLElement>) => {
			updatePointerSession({ event, sessionRef, agenda, blockRoomId: block.roomId, setPreviewTimes });
		},
		endPointerSession: (event: ReactPointerEvent<HTMLElement>) => {
			endPointerSession({
				event,
				sessionRef,
				previewRef,
				block,
				setIsDragging,
				controls,
			});
		},
	};
}
