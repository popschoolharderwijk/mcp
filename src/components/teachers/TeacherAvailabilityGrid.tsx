import { TeacherAvailabilityDayColumn } from '@/components/teachers/TeacherAvailabilityDayColumn';
import type { TeacherAvailabilitySectionViewModel } from '@/components/teachers/useTeacherAvailabilitySection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DAY_NAMES_DISPLAY } from '@/lib/date/day-index';
import {
	type AvailabilityBlock,
	getAvailabilityHourTopPercent,
	getTeacherAvailabilityCardDescription,
} from '@/lib/teachers/teacherAvailabilitySectionHelpers';

const dayNames = DAY_NAMES_DISPLAY;

interface TeacherAvailabilityGridProps {
	vm: TeacherAvailabilitySectionViewModel;
	onEmptySlotClick: (dayIndex: number, time: string) => void;
	onBlockClick: (block: AvailabilityBlock) => void;
}

export function TeacherAvailabilityGrid({ vm, onEmptySlotClick, onBlockClick }: TeacherAvailabilityGridProps) {
	const { canEdit, agenda, timeSlots, hourLabels, availabilityBlocks } = vm;

	return (
		<>
			<style>{`
				.availability-block { container-type: size; container-name: ab; }
				.availability-block .block-content-single { display: flex; }
				.availability-block .block-content-double { display: none; }
				.availability-block .block-edit-icon { display: none; }
				.availability-block .block-edit-icon-small { display: block; }
				@container ab (min-height: 2.5rem) {
					.availability-block .block-content-single { display: none; }
					.availability-block .block-content-double { display: flex; }
				}
				@container ab (min-height: 1.5rem) {
					.availability-block .block-edit-icon { display: block; }
					.availability-block .block-edit-icon-small { display: none; }
				}
			`}</style>
			<Card>
				<CardHeader className="pb-3">
					<CardTitle>Beschikbaarheid</CardTitle>
					<CardDescription>{getTeacherAvailabilityCardDescription(canEdit)}</CardDescription>
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
								onBlockClick={onBlockClick}
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
