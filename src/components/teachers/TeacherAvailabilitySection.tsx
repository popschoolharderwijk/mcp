import { TeacherAvailabilityGrid } from '@/components/teachers/TeacherAvailabilityGrid';
import { TeacherAvailabilitySlotDialog } from '@/components/teachers/TeacherAvailabilitySlotDialog';
import { useTeacherAvailabilitySection } from '@/components/teachers/useTeacherAvailabilitySection';
import { SectionSkeleton } from '@/components/ui/page-skeleton';

interface TeacherAvailabilitySectionProps {
	teacherUserId: string;
	canEdit: boolean;
}

export function TeacherAvailabilitySection({ teacherUserId, canEdit }: TeacherAvailabilitySectionProps) {
	const vm = useTeacherAvailabilitySection(teacherUserId, canEdit);

	if (vm.loading) {
		return <SectionSkeleton />;
	}

	return (
		<>
			<TeacherAvailabilityGrid
				vm={vm}
				onEmptySlotClick={vm.handleEmptySlotClick}
				onCreateRangeCommit={vm.handleCreateRangeCommit}
				onBlockClick={vm.handleBlockClick}
				onBlockTimesCommit={vm.handleBlockTimesCommit}
			/>
			<TeacherAvailabilitySlotDialog vm={vm} />
		</>
	);
}
