import { LuLoaderCircle, LuTriangleAlert } from 'react-icons/lu';
import { Label } from '@/components/ui/label';
import { UsersSelect } from '@/components/ui/users-select';
import type { SlotWithStatus } from '@/lib/agreementSlots';
import { DAY_NAMES } from '@/lib/date/day-index';
import { formatTime } from '@/lib/time/time-format';
import { cn } from '@/lib/utils';

interface TeacherOption {
	id: string;
	userId: string;
	firstName: string | null;
	lastName: string | null;
	email: string | null;
	avatarUrl: string | null;
}

interface TeacherSlotStepContentProps {
	teachers: TeacherOption[];
	selectedTeacher: TeacherOption | undefined;
	teacherUserOptions: Array<{
		user_id: string;
		first_name: string | null;
		last_name: string | null;
		email: string;
		avatar_url: string | null;
	}>;
	slotsWithStatus: SlotWithStatus[];
	selectedSlot: SlotWithStatus | null;
	loadingStep3: boolean;
	isTeacherOwnStudent: boolean;
	onTeacherChange: (userId: string | null) => void;
	onSlotClick: (slot: SlotWithStatus) => void;
}

const slotStatusLabels = {
	free: 'Vrij',
	occupied: 'Bezet',
	partial: 'Deels bezet',
} as const;

export function TeacherSlotStepContent({
	teachers,
	selectedTeacher,
	teacherUserOptions,
	slotsWithStatus,
	selectedSlot,
	loadingStep3,
	isTeacherOwnStudent,
	onTeacherChange,
	onSlotClick,
}: TeacherSlotStepContentProps) {
	return (
		<div className="space-y-4 py-4">
			<div className="space-y-2">
				<Label>Docent</Label>
				<UsersSelect
					value={selectedTeacher?.userId ?? null}
					onChange={(userId) => {
						if (!userId) {
							onTeacherChange(null);
							return;
						}
						const teacher = teachers.find((t) => t.userId === userId);
						onTeacherChange(teacher?.id ?? null);
					}}
					options={teacherUserOptions}
					placeholder="Selecteer docent..."
				/>
				{isTeacherOwnStudent && (
					<p className="text-sm text-destructive flex items-center gap-1 mt-2">
						<LuTriangleAlert className="h-4 w-4" />
						Een docent kan niet zijn eigen leerling zijn.
					</p>
				)}
			</div>
			<div className="space-y-2">
				<Label>Tijdslot</Label>
				{loadingStep3 ? (
					<div className="flex justify-center py-6">
						<LuLoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				) : (
					<div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto rounded-md border p-2">
						{slotsWithStatus.map((slot, idx) => {
							const isSelected =
								selectedSlot?.day_of_week === slot.day_of_week &&
								selectedSlot?.start_time === slot.start_time;
							const isOccupied = slot.status === 'occupied';
							return (
								<button
									key={`${slot.day_of_week}-${slot.start_time}-${idx}`}
									type="button"
									disabled={isOccupied}
									onClick={() => onSlotClick(slot)}
									className={cn(
										'rounded-md border px-3 py-2 text-left text-sm transition-colors',
										isOccupied && 'cursor-not-allowed bg-muted opacity-60',
										!isOccupied && 'hover:bg-accent',
										isSelected && 'ring-2 ring-primary',
										slot.status === 'free' && 'border-green-200 dark:border-green-800',
										slot.status === 'partial' && 'border-amber-200 dark:border-amber-800',
									)}
									title={
										slot.status === 'partial'
											? `${slot.occupiedOccurrences} van ${slot.totalOccurrences} momenten bezet`
											: undefined
									}
								>
									<div className="font-medium">
										{DAY_NAMES[slot.day_of_week]} {formatTime(slot.start_time)}
									</div>
									<div className="text-xs text-muted-foreground">
										{slotStatusLabels[slot.status]}
										{slot.status === 'partial' &&
											` (${slot.occupiedOccurrences}/${slot.totalOccurrences} bezet)`}
									</div>
								</button>
							);
						})}
						{slotsWithStatus.length === 0 && !loadingStep3 && (
							<p className="col-span-2 text-sm text-muted-foreground">
								Geen beschikbare slots voor deze docent in de gekozen periode.
							</p>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
