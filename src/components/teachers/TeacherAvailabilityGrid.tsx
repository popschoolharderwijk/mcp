import { TeacherAvailabilityDayColumn } from '@/components/teachers/TeacherAvailabilityDayColumn';
import type { TeacherAvailabilitySectionViewModel } from '@/components/teachers/useTeacherAvailabilitySection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DAY_NAMES_DISPLAY } from '@/lib/date/day-index';
import {
	type AvailabilityBlock,
	type AvailabilityTimeForm,
	getAvailabilityHourTopPercent,
} from '@/lib/teachers/teacherAvailabilitySectionHelpers';

const dayNames = DAY_NAMES_DISPLAY;

interface TeacherAvailabilityGridProps {
	vm: TeacherAvailabilitySectionViewModel;
	onEmptySlotClick: (dayIndex: number, time: string) => void;
	onCreateRangeCommit: (dayIndex: number, form: AvailabilityTimeForm) => void;
	onBlockClick: (block: AvailabilityBlock) => void;
	onBlockTimesCommit: (block: AvailabilityBlock, form: AvailabilityTimeForm) => boolean | Promise<boolean>;
}

export function TeacherAvailabilityGrid({
	vm,
	onEmptySlotClick,
	onCreateRangeCommit,
	onBlockClick,
	onBlockTimesCommit,
}: TeacherAvailabilityGridProps) {
	const { agenda, timeSlots, hourLabels, availabilityBlocks, canEdit } = vm;

	return (
		<>
			<style>{`
				.availability-block { container-type: size; container-name: ab; }
				.availability-block .block-content-single { display: flex; }
				.availability-block .block-content-double { display: none; }
				@container ab (min-height: 2.5rem) {
					.availability-block .block-content-single { display: none; }
					.availability-block .block-content-double { display: flex; }
				}
			`}</style>
			<Card>
				<CardHeader className="pb-3">
					<CardTitle>Beschikbaarheid</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex border-b border-border pb-2 mb-1">
						<div className="w-12 shrink-0" />
						{dayNames.map((dayName) => (
							<div key={dayName} className="flex-1 text-center text-xs font-semibold text-foreground">
								{dayName.substring(0, 2)}
							</div>
						))}
					</div>

					<div className="flex h-64 sm:h-72 lg:h-80">
						<div className="w-12 shrink-0 relative">
							{hourLabels.map((hour) => (
								<div
									key={hour}
									className="absolute left-0 right-0 text-xs text-muted-foreground leading-none"
									style={{
										top: `${getAvailabilityHourTopPercent(hour, agenda)}%`,
										transform: 'translateY(-50%)',
									}}
								>
									{hour}:00
								</div>
							))}
						</div>

						{dayNames.map((dayName, dayIndex) => (
							<TeacherAvailabilityDayColumn
								key={dayName}
								dayName={dayName}
								dayIndex={dayIndex}
								hours={hourLabels}
								timeSlots={timeSlots}
								blocks={availabilityBlocks}
								agenda={agenda}
								canEdit={canEdit}
								onEmptySlotClick={onEmptySlotClick}
								onCreateRangeCommit={onCreateRangeCommit}
								onBlockClick={onBlockClick}
								onBlockTimesCommit={onBlockTimesCommit}
							/>
						))}
					</div>

					<div className="mt-3 pt-3 border-t border-border flex items-center gap-3 text-xs text-muted-foreground">
						<div className="flex items-center gap-1.5">
							<div className="h-3 w-5 bg-emerald-500/80 rounded-sm" />
							<span>Beschikbaar</span>
						</div>
					</div>
				</CardContent>
			</Card>
		</>
	);
}
