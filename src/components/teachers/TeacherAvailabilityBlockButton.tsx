import { type PointerEvent as ReactPointerEvent, useRef } from 'react';
import { useTeacherAvailabilityBlockPointer } from '@/components/teachers/useTeacherAvailabilityBlockPointer';
import { darkenColor, getContrastTextColor } from '@/lib/color/color-utils';
import type { AgendaSetting } from '@/lib/settings/appSettingsTypes';
import {
	type AvailabilityBlock,
	type AvailabilityBlockPointerMode,
	type AvailabilityTimeForm,
	availabilityBlockCursorClass,
	availabilityUnassignedRoomSurfaceClass,
} from '@/lib/teachers/teacherAvailabilitySectionHelpers';
import { cn } from '@/lib/utils';

interface TeacherAvailabilityBlockButtonProps {
	block: AvailabilityBlock;
	dayName: string;
	agenda: AgendaSetting;
	canEdit: boolean;
	onClick: (block: AvailabilityBlock) => void;
	onTimesCommit: (block: AvailabilityBlock, form: AvailabilityTimeForm) => boolean | Promise<boolean>;
}

function availabilityBlockLabelTitle(startLabel: string, endLabel: string, roomName: string | null): string {
	const times = `${startLabel} – ${endLabel}`;
	if (!roomName) return times;
	return `${times} · ${roomName}`;
}

function AvailabilityBlockRoomName(props: { roomName: string | null; textClassName: string; sizeClass: string }) {
	if (!props.roomName) return null;
	return (
		<span
			className={cn(
				'w-full min-w-0 shrink-0 text-center leading-tight line-clamp-2 break-words',
				props.sizeClass,
				props.textClassName,
			)}
		>
			{props.roomName}
		</span>
	);
}

function AvailabilityBlockTimeLabels(props: {
	show: boolean;
	startLabel: string;
	endLabel: string;
	roomName: string | null;
	textClassName: string;
}) {
	if (!props.show) return null;
	const { startLabel, endLabel, roomName, textClassName } = props;
	const title = availabilityBlockLabelTitle(startLabel, endLabel, roomName);
	return (
		<>
			<div
				className="block-content-single absolute inset-0 flex flex-col px-2 py-0.5 overflow-hidden min-w-0 pointer-events-none"
				title={title}
			>
				<div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center">
					<span className={cn('text-[10px] font-medium leading-tight truncate max-w-full', textClassName)}>
						{startLabel}
					</span>
					<span className={cn('text-[10px] font-medium leading-tight truncate max-w-full', textClassName)}>
						{endLabel}
					</span>
				</div>
				<AvailabilityBlockRoomName roomName={roomName} textClassName={textClassName} sizeClass="text-[8px]" />
			</div>
			<div
				className="block-content-double absolute inset-0 flex flex-col px-2 py-0.5 overflow-hidden min-w-0 pointer-events-none"
				title={title}
			>
				<div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center text-center">
					<span className={cn('text-[12px] font-medium leading-tight truncate max-w-full', textClassName)}>
						{startLabel}
					</span>
					<span className={cn('text-[12px] font-medium leading-tight truncate max-w-full', textClassName)}>
						{endLabel}
					</span>
				</div>
				<AvailabilityBlockRoomName roomName={roomName} textClassName={textClassName} sizeClass="text-[10px]" />
			</div>
		</>
	);
}

function AvailabilityBlockResizeHandles(props: {
	show: boolean;
	onBegin: (event: ReactPointerEvent<HTMLElement>, mode: AvailabilityBlockPointerMode) => void;
	onMove: (event: ReactPointerEvent<HTMLElement>) => void;
	onEnd: (event: ReactPointerEvent<HTMLElement>) => void;
}) {
	if (!props.show) return null;
	return (
		<>
			<span
				className="absolute inset-x-0 top-0 h-2 cursor-ns-resize z-20"
				onPointerDown={(event) => {
					if (event.button !== 0) return;
					props.onBegin(event, 'resize-start');
				}}
				onPointerMove={props.onMove}
				onPointerUp={props.onEnd}
				onPointerCancel={props.onEnd}
			/>
			<span
				className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize z-20"
				onPointerDown={(event) => {
					if (event.button !== 0) return;
					props.onBegin(event, 'resize-end');
				}}
				onPointerMove={props.onMove}
				onPointerUp={props.onEnd}
				onPointerCancel={props.onEnd}
			/>
		</>
	);
}

function availabilityBlockTextClass(roomColor: string | null): string {
	if (!roomColor) return 'text-muted-foreground';
	if (getContrastTextColor(roomColor) === '#000') return 'text-gray-900';
	return 'text-white';
}

function pendingAssignedRoomClass(roomColor: string | null, isPendingSave: boolean): string | false {
	if (!roomColor || !isPendingSave) return false;
	return 'border-dashed opacity-60';
}

function availabilityBlockSurfaceClass(params: {
	roomColor: string | null;
	isPendingSave: boolean;
	canEdit: boolean;
	isDragging: boolean;
}): string {
	const { roomColor, isPendingSave, canEdit, isDragging } = params;
	return cn(
		'availability-block absolute left-0.5 right-0.5 rounded-md shadow-sm transition-[opacity,colors] border focus:outline-none focus:ring-2 focus:ring-ring/50 z-10 touch-none',
		!roomColor && availabilityUnassignedRoomSurfaceClass(isPendingSave),
		pendingAssignedRoomClass(roomColor, isPendingSave),
		availabilityBlockCursorClass(canEdit, isDragging, isPendingSave),
	);
}

function availabilityBlockSurfaceStyle(
	topPercent: number,
	heightPercent: number,
	roomColor: string | null,
): { top: string; height: string; minHeight: string; backgroundColor?: string; borderColor?: string } {
	const style = {
		top: `${topPercent}%`,
		height: `${heightPercent}%`,
		minHeight: '10px',
	};
	if (!roomColor) return style;
	return {
		...style,
		backgroundColor: roomColor,
		borderColor: darkenColor(roomColor, 0.25),
	};
}

function availabilityBlockTitle(
	dayName: string,
	startLabel: string,
	endLabel: string,
	roomName: string | null,
): string {
	const times = `${dayName} ${startLabel} - ${endLabel}`;
	if (!roomName) return times;
	return `${times} · ${roomName}`;
}

function beginMoveOnPrimaryButton(
	event: ReactPointerEvent<HTMLElement>,
	begin: (event: ReactPointerEvent<HTMLElement>, mode: AvailabilityBlockPointerMode) => void,
): void {
	if (event.button !== 0) return;
	begin(event, 'move');
}

export function TeacherAvailabilityBlockButton({
	block,
	dayName,
	agenda,
	canEdit,
	onClick,
	onTimesCommit,
}: TeacherAvailabilityBlockButtonProps) {
	const buttonRef = useRef<HTMLButtonElement>(null);
	const pointer = useTeacherAvailabilityBlockPointer({
		block,
		agenda,
		canEdit,
		buttonRef,
		onClick,
		onTimesCommit,
	});

	const roomColor = block.roomColor;
	const textClassName = availabilityBlockTextClass(roomColor);
	const surfaceClass = availabilityBlockSurfaceClass({
		roomColor,
		isPendingSave: pointer.isPendingSave,
		canEdit,
		isDragging: pointer.isDragging,
	});
	const surfaceStyle = availabilityBlockSurfaceStyle(
		pointer.geometry.topPercent,
		pointer.geometry.heightPercent,
		roomColor,
	);

	return (
		<button
			ref={buttonRef}
			type="button"
			disabled={pointer.isPendingSave}
			className={surfaceClass}
			style={surfaceStyle}
			onPointerDown={(event) => beginMoveOnPrimaryButton(event, pointer.beginPointerSession)}
			onPointerMove={pointer.updatePointerSession}
			onPointerUp={pointer.endPointerSession}
			onPointerCancel={pointer.endPointerSession}
			onClick={(event) => {
				event.preventDefault();
				event.stopPropagation();
			}}
			title={availabilityBlockTitle(dayName, pointer.startLabel, pointer.endLabel, block.roomName)}
		>
			<AvailabilityBlockTimeLabels
				show={pointer.showTimes}
				startLabel={pointer.startLabel}
				endLabel={pointer.endLabel}
				roomName={block.roomName}
				textClassName={textClassName}
			/>
			<AvailabilityBlockResizeHandles
				show={pointer.showResizeHandles}
				onBegin={pointer.beginPointerSession}
				onMove={pointer.updatePointerSession}
				onEnd={pointer.endPointerSession}
			/>
		</button>
	);
}
