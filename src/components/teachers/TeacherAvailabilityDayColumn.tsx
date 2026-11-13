import { useRef } from 'react';
import { TeacherAvailabilityBlockButton } from '@/components/teachers/TeacherAvailabilityBlockButton';
import { useTeacherAvailabilityCreatePointer } from '@/components/teachers/useTeacherAvailabilityCreatePointer';
import type { AgendaSetting } from '@/lib/settings/appSettingsTypes';
import {
	type AvailabilityBlock,
	type AvailabilityTimeForm,
	findAvailabilityBlockCoveringTime,
	getAvailabilityBlocksForDay,
	getAvailabilityHourTopPercent,
	getAvailabilitySlotPosition,
} from '@/lib/teachers/teacherAvailabilitySectionHelpers';

interface TeacherAvailabilityDayColumnProps {
	dayName: string;
	dayIndex: number;
	hours: number[];
	timeSlots: string[];
	blocks: AvailabilityBlock[];
	agenda: AgendaSetting;
	canEdit: boolean;
	onEmptySlotClick: (dayIndex: number, time: string) => void;
	onCreateRangeCommit: (dayIndex: number, form: AvailabilityTimeForm) => void;
	onBlockClick: (block: AvailabilityBlock) => void;
	onBlockTimesCommit: (block: AvailabilityBlock, form: AvailabilityTimeForm) => boolean | Promise<boolean>;
}

export function TeacherAvailabilityDayColumn({
	dayName,
	dayIndex,
	hours,
	timeSlots,
	blocks,
	agenda,
	canEdit,
	onEmptySlotClick,
	onCreateRangeCommit,
	onBlockClick,
	onBlockTimesCommit,
}: TeacherAvailabilityDayColumnProps) {
	const columnRef = useRef<HTMLDivElement>(null);
	const createPointer = useTeacherAvailabilityCreatePointer({
		agenda,
		canEdit,
		dayIndex,
		columnRef,
		onEmptySlotClick,
		onCreateRangeCommit,
	});
	const dayBlocks = getAvailabilityBlocksForDay(blocks, dayIndex);

	return (
		<div
			ref={columnRef}
			className="flex-1 relative border-l border-border/50 touch-none"
			onPointerMove={createPointer.updateCreateSession}
			onPointerUp={createPointer.endCreateSession}
			onPointerCancel={createPointer.endCreateSession}
		>
			{hours.map((hour) => (
				<div
					key={hour}
					className="absolute left-0 right-0 border-t border-border/40"
					style={{ top: `${getAvailabilityHourTopPercent(hour, agenda)}%` }}
				/>
			))}

			{canEdit &&
				timeSlots.slice(0, -1).map((time) => {
					const { topPercent, heightPercent } = getAvailabilitySlotPosition(time, agenda);
					const existingBlock = findAvailabilityBlockCoveringTime(dayBlocks, time);
					if (existingBlock) return null;

					return (
						<button
							type="button"
							key={`${dayName}-${time}`}
							className="absolute left-0 right-0 hover:bg-accent transition-colors border border-transparent hover:border-accent"
							style={{ top: `${topPercent}%`, height: `${heightPercent}%` }}
							onPointerDown={(event) => {
								if (event.button !== 0) return;
								createPointer.beginCreateSession(event, time);
							}}
							onClick={(event) => {
								event.preventDefault();
								event.stopPropagation();
							}}
							title={`${dayName} ${time} - Sleep om beschikbaarheid toe te voegen`}
						/>
					);
				})}

			{createPointer.previewGeometry && (
				<div
					className="absolute left-0.5 right-0.5 rounded-md border border-muted-foreground/40 pointer-events-none z-20 bg-muted/70 bg-[repeating-linear-gradient(-45deg,transparent,transparent_3px,rgba(0,0,0,0.06)_3px,rgba(0,0,0,0.06)_6px)]"
					style={{
						top: `${createPointer.previewGeometry.topPercent}%`,
						height: `${createPointer.previewGeometry.heightPercent}%`,
						minHeight: '10px',
					}}
				/>
			)}

			{dayBlocks.map((block) => (
				<TeacherAvailabilityBlockButton
					key={block.id}
					block={block}
					dayName={dayName}
					agenda={agenda}
					canEdit={canEdit}
					onClick={onBlockClick}
					onTimesCommit={onBlockTimesCommit}
				/>
			))}
		</div>
	);
}
