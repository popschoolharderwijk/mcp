import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { StripeButton } from '@/components/stripe/StripeButton';
import { isValidEmail } from '@/components/students/studentFormTypes';
import { Button } from '@/components/ui/button';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { SubmitButton } from '@/components/ui/submit-button';
import { UserDisplay } from '@/components/ui/user-display';
import { NAV_DESCRIPTIONS, NAV_LABELS } from '@/config/nav-items';
import { useAuth } from '@/hooks/useAuth';
import { type PaymentInviteBusyKind, useResendPaymentInvite } from '@/hooks/useResendPaymentInvite';
import { formatDbDateToUi } from '@/lib/date/date-format';
import { getDisplayName } from '@/lib/display-name';
import { buildStudentDetailPath } from '@/lib/students/studentInfoTabsHelpers';
import {
	type AwaitingMandateRow,
	awaitingSentLabel,
	sortByLongestWaiting,
} from '@/lib/subscriptions/awaitingMandateHelpers';
import { fetchAwaitingMandates } from '@/lib/subscriptions/awaitingMandateLoad';

function ClickableStudentDisplay({ row, className }: { row: AwaitingMandateRow; className?: string }) {
	const navigate = useNavigate();
	return (
		<button
			type="button"
			onClick={(e) => {
				e.stopPropagation();
				navigate(buildStudentDetailPath(row.student.user_id));
			}}
			className={className ?? 'block w-full min-w-0 text-left'}
		>
			<UserDisplay profile={row.student} showEmail />
		</button>
	);
}

function buildAwaitingMandateColumns(): DataTableColumn<AwaitingMandateRow>[] {
	return [
		{
			key: 'student',
			label: 'Leerling',
			sortable: true,
			sortValue: (r) => getDisplayName(r.student),
			className: 'w-64 max-w-64 min-w-0',
			render: (r) => <UserDisplay profile={r.student} showEmail />,
		},
		{ key: 'recipient_email', label: 'Ontvanger', render: (r) => r.recipient_email ?? '-' },
		{ key: 'lesson_type_name', label: 'Lesvorm', sortable: true, sortValue: (r) => r.lesson_type_name },
		{
			key: 'start_date',
			label: 'Startdatum',
			sortable: true,
			sortValue: (r) => r.start_date,
			render: (r) => formatDbDateToUi(r.start_date),
		},
		{
			key: 'last_sent_at',
			label: 'Laatste betaalverzoek',
			sortable: true,
			sortValue: (r) => r.last_sent_at ?? '',
			render: (r) => (r.last_sent_at ? formatDbDateToUi(r.last_sent_at.slice(0, 10)) : 'Nog niet verstuurd'),
		},
		{
			key: 'days_waiting',
			label: 'Dagen wachten',
			sortable: true,
			sortValue: (r) => r.days_waiting,
			className: 'w-32',
			render: (r) => String(r.days_waiting),
		},
	];
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
	return (
		<div className="grid grid-cols-[8rem_1fr] gap-2 text-sm items-center">
			<span className="text-muted-foreground">{label}</span>
			<div className="min-w-0">{value}</div>
		</div>
	);
}

function AwaitingMandateDialogDetails({ row }: { row: AwaitingMandateRow }) {
	return (
		<div className="space-y-3 py-2">
			<DetailRow label="Leerling" value={<ClickableStudentDisplay row={row} />} />
			<DetailRow label="Lesvorm" value={row.lesson_type_name} />
			<DetailRow label="Startdatum" value={formatDbDateToUi(row.start_date)} />
			<DetailRow label="Betaalverzoek" value={awaitingSentLabel(row.last_sent_at)} />
			<DetailRow label="Dagen wachten" value={String(row.days_waiting)} />
		</div>
	);
}

function AwaitingMandateDialogLinkActions(props: {
	row: AwaitingMandateRow;
	busy: boolean;
	resolvePayHref: () => Promise<string | null>;
}) {
	return (
		<div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-between">
			<Button variant="outline" asChild>
				<Link to={`/agreements/${props.row.lesson_agreement_id}`}>Bekijk overeenkomst</Link>
			</Button>
			<StripeButton disabled={props.busy} resolveHref={props.resolvePayHref}>
				Open betaalscherm
			</StripeButton>
		</div>
	);
}

function AwaitingMandateDialogSendRow(props: {
	busy: boolean;
	busyKind: PaymentInviteBusyKind | null;
	recipientEmail: string;
	canResend: boolean;
	onRecipientEmailChange: (value: string) => void;
	onResend: () => void;
}) {
	return (
		<div className="w-full space-y-2 border-t pt-3">
			<Label htmlFor="awaiting-mandate-recipient">E-mail voor betaalverzoek</Label>
			<div className="flex gap-2">
				<Input
					id="awaiting-mandate-recipient"
					type="email"
					autoComplete="email"
					className="min-w-0 flex-1"
					value={props.recipientEmail}
					disabled={props.busy}
					onChange={(e) => props.onRecipientEmailChange(e.target.value)}
					placeholder="naam@voorbeeld.nl"
				/>
				<SubmitButton
					className="shrink-0"
					loading={props.busy && props.busyKind === 'resend'}
					loadingLabel="Versturen..."
					onClick={props.onResend}
					disabled={!props.canResend}
				>
					Stuur betaalverzoek
				</SubmitButton>
			</div>
		</div>
	);
}

function AwaitingMandateDialogFooter(props: {
	row: AwaitingMandateRow;
	busy: boolean;
	busyKind: PaymentInviteBusyKind | null;
	recipientEmail: string;
	canResend: boolean;
	onRecipientEmailChange: (value: string) => void;
	onOpenChange: (open: boolean) => void;
	onResend: () => void;
	resolvePayHref: () => Promise<string | null>;
}) {
	return (
		<DialogFooter className="gap-3 sm:flex-col sm:space-x-0">
			<AwaitingMandateDialogLinkActions row={props.row} busy={props.busy} resolvePayHref={props.resolvePayHref} />
			<AwaitingMandateDialogSendRow
				busy={props.busy}
				busyKind={props.busyKind}
				recipientEmail={props.recipientEmail}
				canResend={props.canResend}
				onRecipientEmailChange={props.onRecipientEmailChange}
				onResend={props.onResend}
			/>
			<Button
				variant="outline"
				className="w-full sm:w-auto sm:self-start"
				disabled={props.busy}
				onClick={() => props.onOpenChange(false)}
			>
				Annuleren
			</Button>
		</DialogFooter>
	);
}

function AwaitingMandateResendDialog(props: {
	row: AwaitingMandateRow | null;
	busy: boolean;
	busyKind: PaymentInviteBusyKind | null;
	recipientEmail: string;
	onRecipientEmailChange: (value: string) => void;
	onOpenChange: (open: boolean) => void;
	onResend: () => void;
	resolvePayHref: () => Promise<string | null>;
}) {
	const row = props.row;
	const canResend = Boolean(row) && !props.busy && isValidEmail(props.recipientEmail.trim());
	return (
		<Dialog open={row !== null} onOpenChange={props.onOpenChange}>
			<DialogContent className="max-w-xl">
				<DialogHeader>
					<DialogTitle>Wacht op machtiging</DialogTitle>
					<DialogDescription>
						Stuur een betaalverzoek (desgewenst naar een ander adres), open het betaalscherm, of bekijk de
						lesovereenkomst.
					</DialogDescription>
				</DialogHeader>
				{row ? (
					<>
						<AwaitingMandateDialogDetails row={row} />
						<AwaitingMandateDialogFooter
							row={row}
							busy={props.busy}
							busyKind={props.busyKind}
							recipientEmail={props.recipientEmail}
							canResend={canResend}
							onRecipientEmailChange={props.onRecipientEmailChange}
							onOpenChange={props.onOpenChange}
							onResend={props.onResend}
							resolvePayHref={props.resolvePayHref}
						/>
					</>
				) : null}
			</DialogContent>
		</Dialog>
	);
}

export default function AwaitingMandate() {
	const { isPrivileged, isLoading } = useAuth();
	const [rows, setRows] = useState<AwaitingMandateRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState('');
	const [selected, setSelected] = useState<AwaitingMandateRow | null>(null);
	const [recipientEmail, setRecipientEmail] = useState('');
	const columns = useMemo(() => buildAwaitingMandateColumns(), []);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			setRows(sortByLongestWaiting(await fetchAwaitingMandates()));
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Kon het overzicht niet laden');
		}
		setLoading(false);
	}, []);
	const { busyId, busyKind, resend, openPayPage } = useResendPaymentInvite(() => {
		setSelected(null);
		void load();
	});

	useEffect(() => {
		if (!isLoading && isPrivileged) void load();
	}, [isLoading, isPrivileged, load]);

	useEffect(() => {
		setRecipientEmail(selected?.recipient_email ?? selected?.student.email ?? '');
	}, [selected]);

	if (isLoading) return <PageSkeleton variant="header-and-cards" />;
	if (!isPrivileged) return <Navigate to="/" replace />;

	const q = search.trim().toLowerCase();
	const filtered = q
		? rows.filter((r) =>
				[getDisplayName(r.student), r.student.email, r.recipient_email, r.lesson_type_name].some((v) =>
					v?.toLowerCase().includes(q),
				),
			)
		: rows;

	return (
		<div className="space-y-6">
			<PageHeader title={NAV_LABELS.awaitingMandate} subtitle={NAV_DESCRIPTIONS.awaitingMandate} />
			<DataTable
				data={filtered}
				columns={columns}
				loading={loading}
				searchQuery={search}
				onSearchChange={setSearch}
				getRowKey={(r) => r.lesson_agreement_id}
				emptyMessage="Er wacht niemand op een machtiging."
				initialSortColumn="days_waiting"
				initialSortDirection="desc"
				rowActions={{
					onEdit: (row) => setSelected(row),
				}}
			/>
			<AwaitingMandateResendDialog
				row={selected}
				busy={busyId !== null}
				busyKind={busyKind}
				recipientEmail={recipientEmail}
				onRecipientEmailChange={setRecipientEmail}
				onOpenChange={(open) => {
					if (!open) setSelected(null);
				}}
				onResend={() => {
					if (!selected) return;
					void resend(selected.lesson_agreement_id, recipientEmail);
				}}
				resolvePayHref={async () => {
					if (!selected) return null;
					return openPayPage(selected.lesson_agreement_id);
				}}
			/>
		</div>
	);
}
