import { useState } from 'react';
import { LuCalendar, LuCalendarPlus, LuTrash2 } from 'react-icons/lu';
import { Navigate, useNavigate } from 'react-router-dom';
import { SignupRequestDialogBody } from '@/components/students/SignupRequestDialogBody';
import { ScheduleTrialLessonDialog } from '@/components/trial-lessons/ScheduleTrialLessonDialog';
import { Button } from '@/components/ui/button';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { DataTable } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NavPageShell } from '@/components/ui/nav-page-shell';
import { useAuth } from '@/hooks/useAuth';
import { useSignupRequestsPageController } from '@/hooks/useSignupRequestsPageController';
import {
	SIGNUP_REQUEST_STATUS_LABELS,
	signupRequestMatchesStatusFilter,
} from '@/lib/signup-requests/signupRequestStatuses';
import type { SignupRequestRowBase } from '@/lib/signup-requests/signupRequestsPageHelpers';
import {
	buildScheduleTrialSignupRequestPayload,
	buildSignupRequestStatusQuickFilter,
	resolveSignupRequestsPageGate,
} from '@/lib/signup-requests/signupRequestsPageShellHelpers';
import {
	listSignupRequestDialogActions,
	type SignupRequestDialogActionId,
	type SignupRequestDialogActionItem,
} from '@/lib/signup-requests/signupRequestsTableActionHelpers';

function signupDeleteDescription(row: SignupRequestRowBase | null): string {
	if (!row) return '';
	return `Weet je zeker dat je de aanmelding van ${row.first_name} ${row.last_name} wilt verwijderen?`;
}

const SIGNUP_DIALOG_ACTION_COPY = {
	delete: { label: 'Verwijderen', variant: 'outline' as const, Icon: LuTrash2 },
	trial: { label: 'Proefles inplannen', variant: 'outline' as const, Icon: LuCalendarPlus },
	process: { label: 'Verwerken', variant: 'default' as const, Icon: LuCalendar },
};

function clickSignupRequestDialogAction(
	id: SignupRequestDialogActionId,
	row: SignupRequestRowBase | null,
	handlers: {
		onDelete: () => void;
		onScheduleTrial: (row: SignupRequestRowBase) => void;
		onProcess: () => void;
	},
) {
	const run = {
		delete: () => handlers.onDelete(),
		trial: () => {
			if (!row) return;
			handlers.onScheduleTrial(row);
		},
		process: () => handlers.onProcess(),
	};
	run[id]();
}

function SignupRequestDialogActionButton({
	action,
	onClick,
}: {
	action: SignupRequestDialogActionItem;
	onClick: () => void;
}) {
	const copy = SIGNUP_DIALOG_ACTION_COPY[action.id];
	const Icon = copy.Icon;
	return (
		<Button variant={copy.variant} onClick={onClick} disabled={action.disabled}>
			<Icon className="h-4 w-4" /> {copy.label}
		</Button>
	);
}

function SignupRequestActionsDialog({
	row,
	busyId,
	onOpenChange,
	onDelete,
	onScheduleTrial,
	onProcess,
}: {
	row: SignupRequestRowBase | null;
	busyId: string | null;
	onOpenChange: (open: boolean) => void;
	onDelete: () => void;
	onScheduleTrial: (row: SignupRequestRowBase) => void;
	onProcess: () => void;
}) {
	const actions = listSignupRequestDialogActions(row, busyId);
	return (
		<Dialog open={row !== null} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-xl">
				<DialogHeader>
					<DialogTitle>Aanmelding</DialogTitle>
				</DialogHeader>
				{row ? <SignupRequestDialogBody request={row} /> : null}
				<DialogFooter className="flex-wrap gap-2 sm:space-x-0">
					{actions.map((action) => (
						<SignupRequestDialogActionButton
							key={action.id}
							action={action}
							onClick={() =>
								clickSignupRequestDialogAction(action.id, row, { onDelete, onScheduleTrial, onProcess })
							}
						/>
					))}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default function SignupRequests() {
	const { isPrivileged, isLoading } = useAuth();
	const navigate = useNavigate();
	const [statusFilter, setStatusFilter] = useState<string | null>('open');
	const [searchQuery, setSearchQuery] = useState('');
	const [confirmDelete, setConfirmDelete] = useState(false);
	const controller = useSignupRequestsPageController({ isPrivileged, navigate });
	const visibleRows = controller.rows.filter((row) => signupRequestMatchesStatusFilter(row.status, statusFilter));
	const pageGate = resolveSignupRequestsPageGate(isLoading, isPrivileged);

	if (pageGate === 'loading') return null;
	if (pageGate === 'denied') return <Navigate to="/" replace />;

	return (
		<>
			<NavPageShell item="signupRequests">
				<DataTable
					columns={controller.columns}
					data={visibleRows}
					loading={controller.loading}
					searchQuery={searchQuery}
					onSearchChange={setSearchQuery}
					searchPlaceholder="Zoeken op naam, e-mail of lessoort..."
					searchFields={[
						(row) => row.first_name,
						(row) => row.last_name,
						(row) => row.email,
						(row) => row.applicant?.first_name,
						(row) => row.applicant?.last_name,
						(row) => row.applicant?.email,
						(row) => row.lesson_type_name,
						(row) => row.option_label,
						(row) => SIGNUP_REQUEST_STATUS_LABELS[row.status],
					]}
					getRowKey={(row) => row.id}
					emptyMessage="Geen aanmeldingen gevonden"
					initialSortColumn="created_at"
					initialSortDirection="desc"
					quickFilter={[buildSignupRequestStatusQuickFilter(statusFilter, setStatusFilter)]}
					rowActions={{ onEdit: (row) => controller.setSelected(row) }}
				/>
			</NavPageShell>
			<SignupRequestActionsDialog
				row={controller.selected}
				busyId={controller.busyId}
				onOpenChange={(open) => {
					if (!open) {
						controller.setSelected(null);
						setConfirmDelete(false);
					}
				}}
				onDelete={() => setConfirmDelete(true)}
				onScheduleTrial={(row) => {
					controller.setSelected(null);
					controller.setTrialFor(row);
				}}
				onProcess={() => {
					void controller.processSelected();
				}}
			/>
			<ConfirmDeleteDialog
				open={confirmDelete}
				onOpenChange={setConfirmDelete}
				title="Aanmelding verwijderen"
				description={signupDeleteDescription(controller.selected)}
				onConfirm={controller.deleteSelected}
			/>
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
