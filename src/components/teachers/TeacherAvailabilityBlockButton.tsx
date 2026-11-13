import { type PointerEvent as ReactPointerEvent, useRef } from 'react';
import { useTeacherAvailabilityBlockPointer } from '@/components/teachers/useTeacherAvailabilityBlockPointer';
import type { AgendaSetting } from '@/lib/settings/appSettingsTypes';
import {
	type AvailabilityBlock,
	type AvailabilityBlockPointerMode,
	type AvailabilityTimeForm,
	availabilityBlockCursorClass,
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

function AvailabilityBlockTimeLabels(props: { startLabel: string; endLabel: string }) {
	const { startLabel, endLabel } = props;
	return (
		<>
			<div
				className="block-content-single absolute inset-0 flex flex-col items-center justify-center gap-0 p-0.5 overflow-hidden min-w-0 pointer-events-none"
				title={`${startLabel} – ${endLabel}`}
			>
				<span className="text-[10px] font-medium leading-tight text-white truncate max-w-full">{startLabel}</span>
				<span className="text-[10px] font-medium leading-tight text-white truncate max-w-full">{endLabel}</span>
			</div>
			<div
				className="block-content-double absolute inset-0 flex flex-col items-center justify-center gap-0 p-0.5 overflow-hidden text-center min-w-0 pointer-events-none"
				title={`${startLabel} – ${endLabel}`}
			>
				<span className="text-[12px] font-medium leading-tight text-white truncate max-w-full">{startLabel}</span>
				<span className="text-[12px] font-medium leading-tight text-white truncate max-w-full">{endLabel}</span>
			</div>
		</>
	);
}

function AvailabilityBlockResizeHandles(props: {
	onBegin: (event: ReactPointerEvent<HTMLElement>, mode: AvailabilityBlockPointerMode) => void;
	onMove: (event: ReactPointerEvent<HTMLElement>) => void;
	onEnd: (event: ReactPointerEvent<HTMLElement>) => void;
}) {
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

	return (
		<button
			ref={buttonRef}
			type="button"
			disabled={pointer.isPendingSave}
			className={cn(
				'availability-block absolute left-0.5 right-0.5 rounded-md shadow-sm transition-[opacity,colors] border focus:outline-none focus:ring-2 focus:ring-white/50 z-10 touch-none',
				pointer.isPendingSave
					? 'bg-emerald-500/35 border-emerald-600/20 border-dashed'
					: 'bg-emerald-500/80 hover:bg-emerald-500 border-emerald-600/30',
				availabilityBlockCursorClass(canEdit, pointer.isDragging, pointer.isPendingSave),
			)}
			style={{
				top: `${pointer.geometry.topPercent}%`,
				height: `${pointer.geometry.heightPercent}%`,
				minHeight: '10px',
			}}
			onPointerDown={(event) => {
				if (event.button !== 0) return;
				pointer.beginPointerSession(event, 'move');
			}}
			onPointerMove={pointer.updatePointerSession}
			onPointerUp={pointer.endPointerSession}
			onPointerCancel={pointer.endPointerSession}
			onClick={(event) => {
				event.preventDefault();
				event.stopPropagation();
			}}
			title={`${dayName} ${pointer.startLabel} - ${pointer.endLabel}`}
		>
			{pointer.showTimes ? (
				<AvailabilityBlockTimeLabels startLabel={pointer.startLabel} endLabel={pointer.endLabel} />
			) : null}
			{canEdit && !pointer.isPendingSave ? (
				<AvailabilityBlockResizeHandles
					onBegin={pointer.beginPointerSession}
					onMove={pointer.updatePointerSession}
					onEnd={pointer.endPointerSession}
				/>
			) : null}
		</button>
	);
}
