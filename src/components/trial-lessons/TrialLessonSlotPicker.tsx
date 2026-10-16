import { UserDisplay } from '@/components/ui/user-display';
import type { FreeSlotForTeacher } from '@/lib/agreementSlots';
import type { TrialLessonSchedulingTeacher } from '@/lib/trial-lessons/loadTrialLessonSchedulingData';
import { formatTrialLessonDateHeader } from '@/lib/trial-lessons/scheduleTrialLessonHelpers';
import { getTrialLessonSlotKey, isTrialLessonSlotSelected } from '@/lib/trial-lessons/scheduleTrialLessonSlotHelpers';
import { resolveTrialLessonSlotRowClassName } from '@/lib/trial-lessons/trialLessonSlotRowHelpers';

interface TrialLessonSlotPickerProps {
	slotsGroupedByDate: Map<string, FreeSlotForTeacher[]>;
	teachers: Map<string, TrialLessonSchedulingTeacher>;
	selected: FreeSlotForTeacher | null;
	onSelect: (slot: FreeSlotForTeacher) => void;
}

const UNKNOWN_TEACHER_PROFILE = {
	first_name: null,
	last_name: null,
	email: 'Onbekende docent',
	avatar_url: null,
};

function TrialLessonSlotRow({
	slot,
	teacher,
	isSelected,
	onSelect,
}: {
	slot: FreeSlotForTeacher;
	teacher: TrialLessonSchedulingTeacher | undefined;
	isSelected: boolean;
	onSelect: (slot: FreeSlotForTeacher) => void;
}) {
	return (
		<li>
			<button
				type="button"
				onClick={() => onSelect(slot)}
				className={resolveTrialLessonSlotRowClassName(isSelected)}
			>
				<span className="w-24 shrink-0 font-mono tabular-nums">
					{slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
				</span>
				<UserDisplay profile={teacher ?? UNKNOWN_TEACHER_PROFILE} />
			</button>
		</li>
	);
}

export function TrialLessonSlotPicker({
	slotsGroupedByDate,
	teachers,
	selected,
	onSelect,
}: TrialLessonSlotPickerProps) {
	return (
		<div className="divide-y">
			{Array.from(slotsGroupedByDate.entries()).map(([date, slots]) => (
				<div key={date}>
					<div className="sticky top-0 bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
						{formatTrialLessonDateHeader(date)}
					</div>
					<ul className="divide-y">
						{slots.map((slot) => (
							<TrialLessonSlotRow
								key={getTrialLessonSlotKey(slot)}
								slot={slot}
								teacher={teachers.get(slot.teacher_user_id)}
								isSelected={isTrialLessonSlotSelected(selected, slot)}
								onSelect={onSelect}
							/>
						))}
					</ul>
				</div>
			))}
		</div>
	);
}
