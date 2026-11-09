import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { StripeButton } from '@/components/stripe/StripeButton';
import { isValidEmail } from '@/components/students/studentFormTypes';
import { Badge } from '@/components/ui/badge';
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
import { PageTabs, PageTabsContent } from '@/components/ui/page-tabs';
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
	filterAwaitingByInviteSent,
	type MandateStatusRow,
	sortByLongestWaiting,
} from '@/lib/subscriptions/awaitingMandateHelpers';
import {
	fetchAwaitingMandates,
	fetchMandatesByLifecycle,
	fetchMandatesTabCounts,
} from '@/lib/subscriptions/awaitingMandateLoad';
import {
	buildMandatesTabItems,
	isMandatesTabId,
	type MandatesTabCounts,
	type MandatesTabId,
	parseMandatesTab,
	resolveMandatesAccess,
	resolveMandatesTabRedirect,
	resolveMandatesTabRoute,
} from '@/lib/subscriptions/mandatesTabsHelpers';
import { resolveSubscriptionStatusBadge } from '@/lib/subscriptions/subscriptionCardHelpers';

function ClickableStudentDisplay({
	student,
	className,
}: {
	student: AwaitingMandateRow['student'];
	className?: string;
}) {
	const navigate = useNavigate();
	return (
		<button
			type="button"
			onClick={(e) => {
				e.stopPropagation();
				navigate(buildStudentDetailPath(student.user_id));
			}}
			className={className ?? 'block w-full min-w-0 text-left'}
		>
			<UserDisplay profile={student} showEmail />
		</button>
	);
}

type MandateTablePerson = {
	student: AwaitingMandateRow['student'];
	lesson_type_name: string;
	start_date: string;
};

function buildSharedMandateColumns<T extends MandateTablePerson>(): DataTableColumn<T>[] {
	return [
		{
			key: 'student',
			label: 'Leerling',
			sortable: true,
			sortValue: (r) => getDisplayName(r.student),
			className: 'w-64 max-w-64 min-w-0',
			render: (r) => <UserDisplay profile={r.student} showEmail />,
		},
		{ key: 'lesson_type_name', label: 'Lesvorm', sortable: true, sortValue: (r) => r.lesson_type_name },
		{
			key: 'start_date',
			label: 'Startdatum',
			sortable: true,
			sortValue: (r) => r.start_date,
			render: (r) => formatDbDateToUi(r.start_date),
		},
	];
}

function buildPendingColumns(): DataTableColumn<AwaitingMandateRow>[] {
	return [
		...buildSharedMandateColumns<AwaitingMandateRow>(),
		{ key: 'recipient_email', label: 'Ontvanger', render: (r) => r.recipient_email ?? '-' },
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

function AgreementActiveBadge({ active }: { active: boolean }) {
	return <Badge variant={active ? 'default' : 'outline'}>{active ? 'Actief' : 'Inactief'}</Badge>;
}

function SubscriptionStatusBadge({ status }: { status: string | null }) {
	const badge = resolveSubscriptionStatusBadge(status);
	if (!badge) return <span className="text-muted-foreground">Onbekend</span>;
	return <Badge variant={badge.variant}>{badge.label}</Badge>;
}

function buildLifecycleColumns(): DataTableColumn<MandateStatusRow>[] {
	return [
		...buildSharedMandateColumns<MandateStatusRow>(),
		{
			key: 'agreement_active',
			label: 'Overeenkomst',
			sortable: true,
			sortValue: (r) => Number(r.agreement_active),
			render: (r) => <AgreementActiveBadge active={r.agreement_active} />,
		},
		{
			key: 'subscription_status',
			label: 'Abonnement',
			sortable: true,
			sortValue: (r) => r.subscription_status ?? '',
			render: (r) => <SubscriptionStatusBadge status={r.subscription_status} />,
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

function WaitingMandateDialogDetails({ row }: { row: AwaitingMandateRow }) {
	return (
		<div className="space-y-3 py-2">
			<DetailRow label="Leerling" value={<ClickableStudentDisplay student={row.student} />} />
			<DetailRow label="Lesvorm" value={row.lesson_type_name} />
			<DetailRow label="Startdatum" value={formatDbDateToUi(row.start_date)} />
			<DetailRow label="Betaalverzoek" value={awaitingSentLabel(row.last_sent_at)} />
			<DetailRow label="Dagen wachten" value={String(row.days_waiting)} />
		</div>
	);
}

function WaitingMandateDialogLinkActions(props: {
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

function WaitingMandateDialogSendRow(props: {
	busy: boolean;
	busyKind: PaymentInviteBusyKind | null;
	recipientEmail: string;
	canResend: boolean;
	onRecipientEmailChange: (value: string) => void;
	onResend: () => void;
}) {
	return (
		<div className="w-full space-y-2 border-t pt-3">
			<Label htmlFor="mandate-waiting-recipient">E-mail voor betaalverzoek</Label>
			<div className="flex gap-2">
				<Input
					id="mandate-waiting-recipient"
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

function WaitingMandateResendDialog(props: {
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
						<WaitingMandateDialogDetails row={row} />
						<DialogFooter className="gap-3 sm:flex-col sm:space-x-0">
							<WaitingMandateDialogLinkActions
								row={row}
								busy={props.busy}
								resolvePayHref={props.resolvePayHref}
							/>
							<WaitingMandateDialogSendRow
								busy={props.busy}
								busyKind={props.busyKind}
								recipientEmail={props.recipientEmail}
								canResend={canResend}
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
					</>
				) : null}
			</DialogContent>
		</Dialog>
	);
}

function filterBySearch<T>(rows: T[], search: string, values: (row: T) => Array<string | null | undefined>): T[] {
	const q = search.trim().toLowerCase();
	if (!q) return rows;
	return rows.filter((row) => values(row).some((v) => v?.toLowerCase().includes(q)));
}

function MandatesAwaitingPanel({ inviteSent }: { inviteSent: boolean }) {
	const [rows, setRows] = useState<AwaitingMandateRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState('');
	const [selected, setSelected] = useState<AwaitingMandateRow | null>(null);
	const [recipientEmail, setRecipientEmail] = useState('');
	const columns = useMemo(() => buildPendingColumns(), []);
	const emptyMessage = inviteSent ? 'Geen machtigingen in afwachting.' : 'Geen onverzonden betaalverzoeken.';

	const load = useCallback(async () => {
		setLoading(true);
		try {
			setRows(sortByLongestWaiting(filterAwaitingByInviteSent(await fetchAwaitingMandates(), inviteSent)));
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Kon het overzicht niet laden');
		}
		setLoading(false);
	}, [inviteSent]);
	const { busyId, busyKind, resend, openPayPage } = useResendPaymentInvite(() => {
		setSelected(null);
		void load();
	});

	useEffect(() => {
		void load();
	}, [load]);

	useEffect(() => {
		setRecipientEmail(selected?.recipient_email ?? selected?.student.email ?? '');
	}, [selected]);

	return (
		<>
			<DataTable
				data={filterBySearch(rows, search, (r) => [
					getDisplayName(r.student),
					r.student.email,
					r.recipient_email,
					r.lesson_type_name,
				])}
				columns={columns}
				loading={loading}
				searchQuery={search}
				onSearchChange={setSearch}
				getRowKey={(r) => r.lesson_agreement_id}
				emptyMessage={emptyMessage}
				initialSortColumn="days_waiting"
				initialSortDirection="desc"
				rowActions={{
					onEdit: (row) => setSelected(row),
				}}
			/>
			<WaitingMandateResendDialog
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
		</>
	);
}

function MandatesLifecyclePanel({ lifecycle }: { lifecycle: 'active' | 'inactive' }) {
	const navigate = useNavigate();
	const [rows, setRows] = useState<MandateStatusRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState('');
	const columns = useMemo(() => buildLifecycleColumns(), []);
	const emptyMessage = lifecycle === 'active' ? 'Geen actieve machtigingen.' : 'Geen inactieve machtigingen.';

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		void fetchMandatesByLifecycle(lifecycle)
			.then((data) => {
				if (!cancelled) setRows(data);
			})
			.catch((e) => {
				if (!cancelled) toast.error(e instanceof Error ? e.message : 'Kon het overzicht niet laden');
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [lifecycle]);

	return (
		<DataTable
			data={filterBySearch(rows, search, (r) => [getDisplayName(r.student), r.student.email, r.lesson_type_name])}
			columns={columns}
			loading={loading}
			searchQuery={search}
			onSearchChange={setSearch}
			getRowKey={(r) => r.lesson_agreement_id}
			emptyMessage={emptyMessage}
			initialSortColumn="agreement_active"
			initialSortDirection="desc"
			rowActions={{
				onEdit: (row) => navigate(`/agreements/${row.lesson_agreement_id}`),
			}}
		/>
	);
}

export default function Mandates() {
	const { isPrivileged, isLoading } = useAuth();
	const { tab: tabParam } = useParams<{ tab?: string }>();
	const navigate = useNavigate();
	const access = resolveMandatesAccess(isLoading, isPrivileged, resolveMandatesTabRedirect(tabParam));
	const activeTab = parseMandatesTab(tabParam);
	const [tabCounts, setTabCounts] = useState<MandatesTabCounts | null>(null);

	useEffect(() => {
		if (access.kind !== 'ok') return;
		let cancelled = false;
		void fetchMandatesTabCounts()
			.then((counts) => {
				if (!cancelled) setTabCounts(counts);
			})
			.catch(() => {
				if (!cancelled) setTabCounts(null);
			});
		return () => {
			cancelled = true;
		};
	}, [access.kind]);

	if (access.kind === 'auth-loading') return <PageSkeleton variant="header-and-tabs" />;
	if (access.kind === 'forbidden') return <Navigate to="/" replace />;
	if (access.kind === 'redirect') return <Navigate to={access.to} replace />;

	const onTabChange = (tab: MandatesTabId) => {
		navigate(resolveMandatesTabRoute(tab));
	};

	return (
		<div className="space-y-6">
			<PageHeader title={NAV_LABELS.mandates} subtitle={NAV_DESCRIPTIONS.mandates} />
			<PageTabs
				value={activeTab}
				onValueChange={onTabChange}
				isTabId={isMandatesTabId}
				items={buildMandatesTabItems(tabCounts)}
			>
				<PageTabsContent value="active" className="space-y-4">
					<MandatesLifecyclePanel lifecycle="active" />
				</PageTabsContent>
				<PageTabsContent value="inactive" className="space-y-4">
					<MandatesLifecyclePanel lifecycle="inactive" />
				</PageTabsContent>
				<PageTabsContent value="pending" className="space-y-4">
					<MandatesAwaitingPanel inviteSent={true} />
				</PageTabsContent>
				<PageTabsContent value="unsent" className="space-y-4">
					<MandatesAwaitingPanel inviteSent={false} />
				</PageTabsContent>
			</PageTabs>
		</div>
	);
}
