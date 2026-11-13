import { type PointerEvent as ReactPointerEvent, useRef, useState } from 'react';
import type { AgendaSetting } from '@/lib/settings/appSettingsTypes';
import {
	type AvailabilityTimeForm,
	availabilityGeometryFromTimes,
	availabilityPointerYToMinutes,
	buildAvailabilityCreateRangeFromMinutes,
	type AvailabilityCreatePointerEndAction,
	resolveAvailabilityCreatePointerEndAction,
} from '@/lib/teachers/teacherAvailabilitySectionHelpers';

interface CreatePointerSession {
	pointerId: number;
	startClientY: number;
	originMinutes: number;
	originTime: string;
}

function releaseColumnPointerCapture(column: HTMLDivElement | null, pointerId: number): void {
	if (column?.hasPointerCapture(pointerId)) {
		column.releasePointerCapture(pointerId);
	}
}

export function useTeacherAvailabilityCreatePointer(params: {
	agenda: AgendaSetting;
	canEdit: boolean;
	dayIndex: number;
	columnRef: React.RefObject<HTMLDivElement | null>;
	onEmptySlotClick: (dayIndex: number, time: string) => void;
	onCreateRangeCommit: (dayIndex: number, form: AvailabilityTimeForm) => void;
}) {
	const { agenda, canEdit, dayIndex, columnRef, onEmptySlotClick, onCreateRangeCommit } = params;
	const createSessionRef = useRef<CreatePointerSession | null>(null);
	const createPreviewRef = useRef<AvailabilityTimeForm | null>(null);
	const [createPreview, setCreatePreview] = useState<AvailabilityTimeForm | null>(null);

	const setCreatePreviewTimes = (next: AvailabilityTimeForm | null) => {
		createPreviewRef.current = next;
		setCreatePreview(next);
	};

	const resolveMinutesAtClientY = (clientY: number): number | null => {
		const columnEl = columnRef.current;
		if (!columnEl) return null;
		const rect = columnEl.getBoundingClientRect();
		return availabilityPointerYToMinutes({
			clientY,
			columnTop: rect.top,
			columnHeight: rect.height,
			agenda,
		});
	};

	const applyCreateEndAction = (action: AvailabilityCreatePointerEndAction, originTime: string) => {
		if (action.kind === 'click') {
			onEmptySlotClick(dayIndex, originTime);
			return;
		}
		if (action.kind === 'commit') onCreateRangeCommit(dayIndex, action.form);
	};

	const beginCreateSession = (event: ReactPointerEvent<HTMLElement>, originTime: string) => {
		if (!canEdit) return;
		const originMinutes = resolveMinutesAtClientY(event.clientY);
		if (originMinutes === null) return;

		event.preventDefault();
		event.stopPropagation();
		columnRef.current?.setPointerCapture(event.pointerId);

		createSessionRef.current = {
			pointerId: event.pointerId,
			startClientY: event.clientY,
			originMinutes,
			originTime,
		};
		setCreatePreviewTimes(
			buildAvailabilityCreateRangeFromMinutes({
				originMinutes,
				currentMinutes: originMinutes,
				agenda,
			}),
		);
	};

	const updateCreateSession = (event: ReactPointerEvent<HTMLElement>) => {
		const session = createSessionRef.current;
		if (!session || event.pointerId !== session.pointerId) return;

		const currentMinutes = resolveMinutesAtClientY(event.clientY);
		if (currentMinutes === null) return;

		setCreatePreviewTimes(
			buildAvailabilityCreateRangeFromMinutes({
				originMinutes: session.originMinutes,
				currentMinutes,
				agenda,
			}),
		);
	};

	const endCreateSession = (event: ReactPointerEvent<HTMLElement>) => {
		const session = createSessionRef.current;
		if (!session || event.pointerId !== session.pointerId) return;

		releaseColumnPointerCapture(columnRef.current, event.pointerId);
		const action = resolveAvailabilityCreatePointerEndAction({
			deltaYPx: event.clientY - session.startClientY,
			preview: createPreviewRef.current,
		});
		const originTime = session.originTime;
		createSessionRef.current = null;
		setCreatePreviewTimes(null);
		applyCreateEndAction(action, originTime);
	};

	const previewGeometry = createPreview
		? availabilityGeometryFromTimes(createPreview.start_time, createPreview.end_time, agenda)
		: null;

	return {
		previewGeometry,
		beginCreateSession,
		updateCreateSession,
		endCreateSession,
	};
}
