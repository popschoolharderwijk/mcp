import { TeacherAvailabilityBlockButton } from '@/components/teachers/TeacherAvailabilityBlockButton';
import {
	type AvailabilityBlock,
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
	canEdit: boolean;
	onEmptySlotClick: (dayIndex: number, time: string) => void;
	onBlockClick: (block: AvailabilityBlock) => void;
}

export function TeacherAvailabilityDayColumn({
	dayName,
	dayIndex,
	hours,
	timeSlots,
	blocks,
	canEdit,
	onEmptySlotClick,
	onBlockClick,
}: TeacherAvailabilityDayColumnProps) {
	const dayBlocks = getAvailabilityBlocksForDay(blocks, dayIndex);

	return (
		<div className="flex-1 relative border-l border-border/50">
			{hours.map((hour) => (
				<div
					key={hour}
					className="absolute left-0 right-0 border-t border-border/40"
					style={{ top: `${getAvailabilityHourTopPercent(hour)}%` }}
				/>
			))}

			{canEdit &&
				timeSlots.slice(0, -1).map((time) => {
					const { topPercent, heightPercent } = getAvailabilitySlotPosition(time);
					const existingBlock = findAvailabilityBlockCoveringTime(dayBlocks, time);
					if (existingBlock) return null;

					return (
						<button
							type="button"
							key={`${dayName}-${time}`}
							className="absolute left-0 right-0 hover:bg-accent transition-colors border border-transparent hover:border-accent"
							style={{ top: `${topPercent}%`, height: `${heightPercent}%` }}
							onClick={() => onEmptySlotClick(dayIndex, time)}
							title={`${dayName} ${time} - Klik om beschikbaarheid toe te voegen`}
						/>
					);
				})}

			{dayBlocks.map((block) => (
				<TeacherAvailabilityBlockButton
					key={block.id}
					block={block}
					dayName={dayName}
					canEdit={canEdit}
					onClick={onBlockClick}
				/>
			))}
		</div>
	);
}
