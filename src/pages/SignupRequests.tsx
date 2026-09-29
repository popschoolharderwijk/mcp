import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ScheduleTrialLessonDialog } from '@/components/trial-lessons/ScheduleTrialLessonDialog';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { PageShell } from '@/components/ui/page-shell';
import { NAV_LABELS } from '@/config/nav-labels';
import { useAuth } from '@/hooks/useAuth';
import { useSignupRequestsPageController } from '@/hooks/useSignupRequestsPageController';
import {
	buildScheduleTrialSignupRequestPayload,
	resolveSignupRequestsPageGate,
	resolveSignupStatusFilterVariant,
} from '@/lib/signup-requests/signupRequestsPageShellHelpers';

export default function SignupRequests() {
	const { isPrivileged, isLoading } = useAuth();
	const navigate = useNavigate();
	const [statusFilter, setStatusFilter] = useState<'pending' | 'all'>('pending');
	const controller = useSignupRequestsPageController({ isPrivileged, navigate, statusFilter });
	const pageGate = resolveSignupRequestsPageGate(isLoading, isPrivileged);

	if (pageGate === 'loading') return null;
	if (pageGate === 'denied') return <Navigate to="/" replace />;

	return (
		<>
			<PageShell
				title={NAV_LABELS.signupRequests}
				description="Beheer openstaande en afgehandelde aanmeldingen"
				actions={
					<div className="flex gap-2">
						<Button
							size="sm"
							variant={resolveSignupStatusFilterVariant(statusFilter, 'pending')}
							onClick={() => setStatusFilter('pending')}
						>
							Open
						</Button>
						<Button
							size="sm"
							variant={resolveSignupStatusFilterVariant(statusFilter, 'all')}
							onClick={() => setStatusFilter('all')}
						>
							Alle
						</Button>
					</div>
				}
			>
				<DataTable
					columns={controller.columns}
					data={controller.rows}
					loading={controller.loading}
					getRowKey={(row) => row.id}
				/>
			</PageShell>
			<ScheduleTrialLessonDialog
				open={controller.trialFor !== null}
				onOpenChange={(open) => !open && controller.setTrialFor(null)}
				signupRequest={buildScheduleTrialSignupRequestPayload(controller.trialFor)}
				onScheduled={() => {
					controller.setTrialFor(null);
					controller.loadSignupRequests();
				}}
			/>
		</>
	);
}
