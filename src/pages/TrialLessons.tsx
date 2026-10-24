import { LuPlus } from 'react-icons/lu';
import { Navigate, useNavigate } from 'react-router-dom';
import { ScheduleTrialLessonDialog } from '@/components/trial-lessons/ScheduleTrialLessonDialog';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { NavPageShell } from '@/components/ui/nav-page-shell';
import { useAuth } from '@/hooks/useAuth';
import { useTrialLessonsPageController } from '@/hooks/useTrialLessonsPageController';

export default function TrialLessons() {
	const { isPrivileged, isLoading } = useAuth();
	const navigate = useNavigate();
	const controller = useTrialLessonsPageController({ isPrivileged, navigate });

	if (isLoading) return null;
	if (!isPrivileged) return <Navigate to="/" replace />;

	return (
		<>
			<NavPageShell
				item="trialLessons"
				actions={
					<Button onClick={() => controller.setOpenSchedule(true)}>
						<LuPlus className="mr-2 h-4 w-4" />
						Proefles inplannen
					</Button>
				}
			>
				<DataTable
					columns={controller.columns}
					data={controller.rows}
					loading={controller.loading}
					getRowKey={(row) => row.id}
					emptyMessage="Nog geen proeflessen ingepland."
				/>
			</NavPageShell>
			<ScheduleTrialLessonDialog
				open={controller.openSchedule}
				onOpenChange={controller.setOpenSchedule}
				onScheduled={controller.load}
			/>
		</>
	);
}
