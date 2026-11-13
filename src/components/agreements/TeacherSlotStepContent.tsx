import { useMemo } from 'react';
import { TeacherSelectField } from '@/components/agreements/TeacherSelectField';
import { TeacherSlotDaySection } from '@/components/agreements/TeacherSlotDaySection';
import { TeacherSlotLegend } from '@/components/agreements/TeacherSlotLegend';
import { groupTeacherSlotsByDay } from '@/components/agreements/teacherSlotStepContentHelpers';
import { Label } from '@/components/ui/label';
import { SectionSkeleton } from '@/components/ui/page-skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { SlotWithStatus } from '@/lib/agreementSlots';

/** Slot of the existing agreement when editing (for clear visual marking) */
interface CurrentAgreementSlot {
	day_of_week: number;
	start_time: string;
}

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

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
	/** User IDs to exclude from the teacher list (e.g. the student so they can't be their own teacher) */
	excludeUserIds?: string[];
	/** When set, restrict the teacher dropdown to these user IDs (e.g. only teachers offering a lesson type) */
	includeUserIds?: string[];
	slotsWithStatus: SlotWithStatus[];
	selectedSlot: SlotWithStatus | null;
	/** When editing: the time slot of the existing agreement (shown with solid background) */
	currentAgreementSlot?: CurrentAgreementSlot | null;
	loadingStep3: boolean;
	isTeacherOwnStudent: boolean;
	onTeacherChange: (userId: string | null) => void;
	onSlotClick: (slot: SlotWithStatus) => void;
	onReloadSlots?: () => void;
}

export function TeacherSlotStepContent({
	teachers,
	selectedTeacher,
	excludeUserIds = [],
	includeUserIds,
	slotsWithStatus,
	selectedSlot,
	currentAgreementSlot = null,
	loadingStep3,
	isTeacherOwnStudent,
	onTeacherChange,
	onSlotClick,
	onReloadSlots,
}: TeacherSlotStepContentProps) {
	const slotsByDay = useMemo(() => groupTeacherSlotsByDay(slotsWithStatus), [slotsWithStatus]);

	return (
		<div className="space-y-4 py-4">
			<TeacherSelectField
				teachers={teachers}
				selectedTeacher={selectedTeacher}
				excludeUserIds={excludeUserIds}
				includeUserIds={includeUserIds}
				isTeacherOwnStudent={isTeacherOwnStudent}
				onTeacherChange={onTeacherChange}
			/>
			<div className="space-y-2">
				<Label>Tijdslot</Label>
				<div className="space-y-2">
					<TeacherSlotLegend onReload={onReloadSlots} reloading={loadingStep3} />
					{loadingStep3 && slotsWithStatus.length === 0 ? (
						<SectionSkeleton className="py-6" />
					) : (
						<ScrollArea className="h-72 rounded-md border">
							<div className="p-2 space-y-3">
								{slotsWithStatus.length === 0 ? (
									<p className="text-sm text-muted-foreground py-2">
										Geen beschikbare slots voor deze docent in de gekozen periode.
									</p>
								) : (
									DAY_ORDER.map((dayOfWeek) => {
										const daySlots = slotsByDay.get(dayOfWeek);
										if (!daySlots?.length) return null;
										return (
											<TeacherSlotDaySection
												key={dayOfWeek}
												dayOfWeek={dayOfWeek}
												daySlots={daySlots}
												selectedSlot={selectedSlot}
												currentAgreementSlot={currentAgreementSlot}
												onSlotClick={onSlotClick}
											/>
										);
									})
								)}
							</div>
						</ScrollArea>
					)}
				</div>
			</div>
		</div>
	);
}
