import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { StripeButton } from '@/components/stripe/StripeButton';
import { isValidEmail } from '@/components/students/studentFormTypes';
import { Autocomplete } from '@/components/ui/autocomplete';
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
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { PageTabs, PageTabsContent } from '@/components/ui/page-tabs';
import { SubmitButton } from '@/components/ui/submit-button';
import { UserDisplay } from '@/components/ui/user-display';
import { NAV_DESCRIPTIONS, NAV_LABELS } from '@/config/nav-items';
import { useAuth } from '@/hooks/useAuth';
import { type PaymentInviteBusyKind, useResendPaymentInvite } from '@/hooks/useResendPaymentInvite';
import { supabase } from '@/integrations/supabase/client';
import { getInvokeErrorMessage } from '@/lib/auth/invokeError';
import { formatDbDateToUi } from '@/lib/date/date-format';
import { getDisplayName } from '@/lib/display-name';
import { buildStudentDetailPath } from '@/lib/students/studentInfoTabsHelpers';
import {
	type AwaitingMandateRow,
	awaitingSentLabel,
	buildMandateRecipientSuggestions,
	filterAwaitingByInviteSent,
	type MandateStatusRow,
	mandateStatusRowToInviteTarget,
	resolveMandateInviteSeedEmail,
	sortByLongestWaiting,
} from '@/lib/subscriptions/awaitingMandateHelpers';
import {
	fetchAwaitingMandates,
	fetchMandatesByLifecycle,
	fetchMandatesTabCounts,
} from '@/lib/subscriptions/awaitingMandateLoad';
import {
	buildMandatesTabItems,
	fetchMandateRowsKeepingUnchanged,
	formatMandatesReconcileToast,
	isMandatesTabId,
	keepIfUnchanged,
	MANDATES_VISIBLE_POLL_MS,
	type MandatesTabCounts,
	type MandatesTabId,
	mandateOverviewLoadErrorMessage,
	parseMandatesReconcileSummary,
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

type MandateInviteDialogMode = 'awaiting' | 'reoffer' | 'active';

const MANDATE_DIALOG_COPY: Record<MandateInviteDialogMode, { title: string; description: string }> = {
	awaiting: {
		title: 'Wacht op machtiging',
		description:
			'Stuur een betaalverzoek (desgewenst naar een ander adres), open het betaalscherm (stuurt eerst het verzoek en opent daarna de betaallink), of bekijk de lesovereenkomst.',
	},
	reoffer: {
		title: 'Opnieuw abonnement aanbieden',
		description:
			'Stuur opnieuw een betaalverzoek (desgewenst naar een ander adres), open het betaalscherm (stuurt eerst het verzoek en opent daarna de betaallink), of bekijk de lesovereenkomst.',
	},
	active: {
		title: 'Actieve machtiging',
		description: 'Bekijk de status of open de lesovereenkomst.',
	},
};

function MandateDialogModeRows(props: {
	row: AwaitingMandateRow;
	mode: MandateInviteDialogMode;
	subscriptionStatus: string | null;
	agreementActive: boolean | null;
}) {
	if (props.mode === 'awaiting') {
		return (
			<>
				<DetailRow label="Betaalverzoek" value={awaitingSentLabel(props.row.last_sent_at)} />
				<DetailRow label="Dagen wachten" value={String(props.row.days_waiting)} />
			</>
		);
	}
	if (props.mode === 'reoffer') {
		return <DetailRow label="Status" value={<Badge variant="destructive">Geannuleerd</Badge>} />;
	}
	return (
		<>
			<DetailRow label="Abonnement" value={<SubscriptionStatusBadge status={props.subscriptionStatus} />} />
			<DetailRow label="Overeenkomst" value={<AgreementActiveBadge active={Boolean(props.agreementActive)} />} />
		</>
	);
}

function WaitingMandateDialogDetails(props: {
	row: AwaitingMandateRow;
	mode: MandateInviteDialogMode;
	subscriptionStatus: string | null;
	agreementActive: boolean | null;
}) {
	return (
		<div className="space-y-3 py-2">
			<DetailRow label="Leerling" value={<ClickableStudentDisplay student={props.row.student} />} />
			<DetailRow label="Lesvorm" value={props.row.lesson_type_name} />
			<DetailRow label="Startdatum" value={formatDbDateToUi(props.row.start_date)} />
			<MandateDialogModeRows
				row={props.row}
				mode={props.mode}
				subscriptionStatus={props.subscriptionStatus}
				agreementActive={props.agreementActive}
			/>
		</div>
	);
}

function WaitingMandateDialogLinkActions(props: {
	row: AwaitingMandateRow;
	busy: boolean;
	showPayLink: boolean;
	resolvePayHref: () => Promise<string | null>;
}) {
	return (
		<div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-between">
			<Button variant="outline" asChild>
				<Link to={`/agreements/${props.row.lesson_agreement_id}`}>Bekijk overeenkomst</Link>
			</Button>
			{props.showPayLink ? (
				<StripeButton disabled={props.busy} resolveHref={props.resolvePayHref}>
					Open betaalscherm
				</StripeButton>
			) : null}
		</div>
	);
}

function WaitingMandateDialogSendRow(props: {
	busy: boolean;
	busyKind: PaymentInviteBusyKind | null;
	recipientEmail: string;
	recipientItems: ReturnType<typeof buildMandateRecipientSuggestions>;
	canResend: boolean;
	onRecipientEmailChange: (value: string) => void;
	onResend: () => void;
}) {
	return (
		<div className="w-full space-y-2 border-t pt-3">
			<Label htmlFor="mandate-waiting-recipient">E-mail voor betaalverzoek</Label>
			<div className="flex gap-2">
				<Autocomplete
					id="mandate-waiting-recipient"
					className="min-w-0 flex-1"
					value={props.recipientEmail}
					onValueChange={props.onRecipientEmailChange}
					items={props.recipientItems}
					disabled={props.busy}
					placeholder="naam@voorbeeld.nl"
					emptyText=""
					inputProps={{ type: 'email', autoComplete: 'email' }}
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

function canSendMandateInvite(hasRow: boolean, allowSend: boolean, busy: boolean, recipientEmail: string): boolean {
	return hasRow && allowSend && !busy && isValidEmail(recipientEmail.trim());
}

type MandateInviteDialogHandlers = {
	busy: boolean;
	busyKind: PaymentInviteBusyKind | null;
	recipientEmail: string;
	onRecipientEmailChange: (value: string) => void;
	onOpenChange: (open: boolean) => void;
	onResend: () => void;
	resolvePayHref: () => Promise<string | null>;
};

function useMandateInviteSelection<T extends { lesson_agreement_id: string }>(
	emailFromRow: (row: T) => string,
	reload: () => void,
): {
	selected: T | null;
	setSelected: (row: T | null) => void;
	handlers: MandateInviteDialogHandlers;
} {
	const [selected, setSelected] = useState<T | null>(null);
	const [recipientEmail, setRecipientEmail] = useState('');
	const { busyId, busyKind, resend, openPayPage } = useResendPaymentInvite(() => {
		setSelected(null);
		reload();
	});

	useEffect(() => {
		setRecipientEmail(selected ? emailFromRow(selected) : '');
	}, [selected, emailFromRow]);

	return {
		selected,
		setSelected,
		handlers: {
			busy: busyId !== null,
			busyKind,
			recipientEmail,
			onRecipientEmailChange: setRecipientEmail,
			onOpenChange: (open) => {
				if (!open) setSelected(null);
			},
			onResend: () => {
				if (!selected) return;
				void resend(selected.lesson_agreement_id, recipientEmail);
			},
			resolvePayHref: async () => {
				if (!selected) return null;
				return openPayPage(selected.lesson_agreement_id, recipientEmail);
			},
		},
	};
}

function emailFromAwaitingRow(row: AwaitingMandateRow): string {
	return row.recipient_email ?? '';
}

function emailFromStatusRow(row: MandateStatusRow): string {
	return resolveMandateInviteSeedEmail({
		parentEmail: row.parent_email,
		studentEmail: row.student.email,
	});
}

function recipientItemsFromAwaitingRow(row: AwaitingMandateRow) {
	return buildMandateRecipientSuggestions({
		parentEmail: row.parent_email,
		studentEmail: row.student.email,
	});
}

function WaitingMandateDialogBody(props: {
	row: AwaitingMandateRow;
	mode: MandateInviteDialogMode;
	allowSend: boolean;
	showSend: boolean;
	showPayLink: boolean;
	subscriptionStatus: string | null;
	agreementActive: boolean | null;
	handlers: MandateInviteDialogHandlers;
}) {
	const canResend = canSendMandateInvite(true, props.allowSend, props.handlers.busy, props.handlers.recipientEmail);
	return (
		<>
			<WaitingMandateDialogDetails
				row={props.row}
				mode={props.mode}
				subscriptionStatus={props.subscriptionStatus}
				agreementActive={props.agreementActive}
			/>
			<DialogFooter className="gap-3 sm:flex-col sm:space-x-0">
				<WaitingMandateDialogLinkActions
					row={props.row}
					busy={props.handlers.busy}
					showPayLink={props.showPayLink}
					resolvePayHref={props.handlers.resolvePayHref}
				/>
				{props.showSend ? (
					<WaitingMandateDialogSendRow
						busy={props.handlers.busy}
						busyKind={props.handlers.busyKind}
						recipientEmail={props.handlers.recipientEmail}
						recipientItems={recipientItemsFromAwaitingRow(props.row)}
						canResend={canResend}
						onRecipientEmailChange={props.handlers.onRecipientEmailChange}
						onResend={props.handlers.onResend}
					/>
				) : null}
				<Button
					variant="outline"
					className="w-full sm:w-auto sm:self-start"
					disabled={props.handlers.busy}
					onClick={() => props.handlers.onOpenChange(false)}
				>
					Sluiten
				</Button>
			</DialogFooter>
		</>
	);
}

function WaitingMandateResendDialog(props: {
	row: AwaitingMandateRow | null;
	mode: MandateInviteDialogMode;
	allowSend: boolean;
	showSend: boolean;
	showPayLink: boolean;
	subscriptionStatus: string | null;
	agreementActive: boolean | null;
	handlers: MandateInviteDialogHandlers;
}) {
	const copy = MANDATE_DIALOG_COPY[props.mode];
	return (
		<Dialog open={props.row !== null} onOpenChange={props.handlers.onOpenChange}>
			<DialogContent className="max-w-xl">
				<DialogHeader>
					<DialogTitle>{copy.title}</DialogTitle>
					<DialogDescription>{copy.description}</DialogDescription>
				</DialogHeader>
				{props.row ? (
					<WaitingMandateDialogBody
						row={props.row}
						mode={props.mode}
						allowSend={props.allowSend}
						showSend={props.showSend}
						showPayLink={props.showPayLink}
						subscriptionStatus={props.subscriptionStatus}
						agreementActive={props.agreementActive}
						handlers={props.handlers}
					/>
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

type MandateRowsSetter<T> = (update: T[] | ((previous: T[]) => T[])) => void;

function setMandateLoadingVisible(silent: boolean, setLoading: (loading: boolean) => void, loading: boolean): void {
	if (!silent) setLoading(loading);
}

function toastMandateLoadFailureIfVisible(silent: boolean, error: unknown): void {
	if (silent) return;
	toast.error(mandateOverviewLoadErrorMessage(error));
}

async function loadMandateRowsIntoState<T>(
	fetchRows: () => Promise<T[]>,
	setRows: MandateRowsSetter<T>,
	setLoading: (loading: boolean) => void,
	options?: { silent?: boolean },
): Promise<void> {
	const silent = options?.silent === true;
	setMandateLoadingVisible(silent, setLoading, true);
	const result = await fetchMandateRowsKeepingUnchanged(fetchRows, setRows);
	if (result.ok === false) {
		toastMandateLoadFailureIfVisible(silent, result.error);
	}
	setMandateLoadingVisible(silent, setLoading, false);
}

function lifecycleEmptyMessage(lifecycle: 'active' | 'canceled'): string {
	return lifecycle === 'active' ? 'Geen actieve machtigingen.' : 'Geen geannuleerde machtigingen.';
}

function lifecycleInviteDialogConfig(
	lifecycle: 'active' | 'canceled',
	selected: MandateStatusRow | null,
): {
	mode: MandateInviteDialogMode;
	allowSend: boolean;
	showSend: boolean;
	showPayLink: boolean;
} {
	if (lifecycle === 'canceled') {
		return {
			mode: 'reoffer',
			allowSend: Boolean(selected?.agreement_active),
			showSend: true,
			showPayLink: true,
		};
	}
	return { mode: 'active', allowSend: false, showSend: false, showPayLink: false };
}

function mandatePersonSearchValues(row: MandateTablePerson): Array<string | null | undefined> {
	return [getDisplayName(row.student), row.student.email, row.lesson_type_name];
}

function MandateAgreementsTable<T extends MandateTablePerson & { lesson_agreement_id: string }>(props: {
	rows: T[];
	search: string;
	onSearchChange: (value: string) => void;
	columns: DataTableColumn<T>[];
	loading: boolean;
	emptyMessage: string;
	initialSortColumn: string;
	searchValues: (row: T) => Array<string | null | undefined>;
	onSelect: (row: T) => void;
}) {
	return (
		<DataTable
			data={filterBySearch(props.rows, props.search, props.searchValues)}
			columns={props.columns}
			loading={props.loading}
			searchQuery={props.search}
			onSearchChange={props.onSearchChange}
			getRowKey={(r) => r.lesson_agreement_id}
			emptyMessage={props.emptyMessage}
			initialSortColumn={props.initialSortColumn}
			initialSortDirection="desc"
			rowActions={{
				onEdit: props.onSelect,
			}}
		/>
	);
}

type MandatePanelLoadOptions = { silent?: boolean };

function useMandatePanelRows<T>(
	fetchRows: () => Promise<T[]>,
	refreshToken: number,
): {
	rows: T[];
	loading: boolean;
	search: string;
	setSearch: (value: string) => void;
	load: (options?: MandatePanelLoadOptions) => Promise<void>;
} {
	const [rows, setRows] = useState<T[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState('');
	const load = useCallback(
		async (options?: MandatePanelLoadOptions) => {
			await loadMandateRowsIntoState(fetchRows, setRows, setLoading, options);
		},
		[fetchRows],
	);

	useEffect(() => {
		void load();
	}, [load]);

	useEffect(() => {
		if (refreshToken === 0) return;
		void load({ silent: true });
	}, [refreshToken, load]);

	return { rows, loading, search, setSearch, load };
}

function MandatesAwaitingPanel({ inviteSent, refreshToken }: { inviteSent: boolean; refreshToken: number }) {
	const columns = useMemo(() => buildPendingColumns(), []);
	const fetchRows = useCallback(
		async () => sortByLongestWaiting(filterAwaitingByInviteSent(await fetchAwaitingMandates(), inviteSent)),
		[inviteSent],
	);
	const { rows, loading, search, setSearch, load } = useMandatePanelRows(fetchRows, refreshToken);
	const { selected, setSelected, handlers } = useMandateInviteSelection(emailFromAwaitingRow, () => {
		void load();
	});
	const emptyMessage = inviteSent ? 'Geen machtigingen in afwachting.' : 'Geen onverzonden betaalverzoeken.';

	return (
		<>
			<MandateAgreementsTable
				rows={rows}
				search={search}
				onSearchChange={setSearch}
				columns={columns}
				loading={loading}
				emptyMessage={emptyMessage}
				initialSortColumn="days_waiting"
				searchValues={(r) => [...mandatePersonSearchValues(r), r.recipient_email]}
				onSelect={setSelected}
			/>
			<WaitingMandateResendDialog
				row={selected}
				mode="awaiting"
				allowSend={true}
				showSend={true}
				showPayLink={true}
				subscriptionStatus={null}
				agreementActive={null}
				handlers={handlers}
			/>
		</>
	);
}

function inviteTargetFromStatus(selected: MandateStatusRow | null): AwaitingMandateRow | null {
	if (!selected) return null;
	return mandateStatusRowToInviteTarget(selected);
}

function statusFieldsFromSelected(selected: MandateStatusRow | null): {
	subscriptionStatus: string | null;
	agreementActive: boolean | null;
} {
	if (!selected) return { subscriptionStatus: null, agreementActive: null };
	return {
		subscriptionStatus: selected.subscription_status,
		agreementActive: selected.agreement_active,
	};
}

function LifecycleMandateInviteDialog(props: {
	lifecycle: 'active' | 'canceled';
	selected: MandateStatusRow | null;
	handlers: MandateInviteDialogHandlers;
}) {
	const config = lifecycleInviteDialogConfig(props.lifecycle, props.selected);
	const statusFields = statusFieldsFromSelected(props.selected);
	return (
		<WaitingMandateResendDialog
			row={inviteTargetFromStatus(props.selected)}
			mode={config.mode}
			allowSend={config.allowSend}
			showSend={config.showSend}
			showPayLink={config.showPayLink}
			subscriptionStatus={statusFields.subscriptionStatus}
			agreementActive={statusFields.agreementActive}
			handlers={props.handlers}
		/>
	);
}

function MandatesLifecyclePanel({
	lifecycle,
	refreshToken,
}: {
	lifecycle: 'active' | 'canceled';
	refreshToken: number;
}) {
	const columns = useMemo(() => buildLifecycleColumns(), []);
	const fetchRows = useCallback(() => fetchMandatesByLifecycle(lifecycle), [lifecycle]);
	const { rows, loading, search, setSearch, load } = useMandatePanelRows(fetchRows, refreshToken);
	const { selected, setSelected, handlers } = useMandateInviteSelection(emailFromStatusRow, () => {
		void load();
	});

	return (
		<>
			<MandateAgreementsTable
				rows={rows}
				search={search}
				onSearchChange={setSearch}
				columns={columns}
				loading={loading}
				emptyMessage={lifecycleEmptyMessage(lifecycle)}
				initialSortColumn="agreement_active"
				searchValues={mandatePersonSearchValues}
				onSelect={setSelected}
			/>
			<LifecycleMandateInviteDialog lifecycle={lifecycle} selected={selected} handlers={handlers} />
		</>
	);
}

export default function Mandates() {
	const { isPrivileged, isLoading, isSiteAdmin } = useAuth();
	const { tab: tabParam } = useParams<{ tab?: string }>();
	const navigate = useNavigate();
	const access = resolveMandatesAccess(isLoading, isPrivileged, resolveMandatesTabRedirect(tabParam));
	const activeTab = parseMandatesTab(tabParam);
	const [tabCounts, setTabCounts] = useState<MandatesTabCounts | null>(null);
	const [refreshKey, setRefreshKey] = useState(0);
	const [reconciling, setReconciling] = useState(false);

	const bumpRefresh = useCallback(() => {
		setRefreshKey((key) => key + 1);
	}, []);

	const loadTabCounts = useCallback(async () => {
		if (access.kind !== 'ok') return;
		try {
			const next = await fetchMandatesTabCounts();
			setTabCounts((previous) => keepIfUnchanged(previous, next));
		} catch {
			setTabCounts((previous) => keepIfUnchanged(previous, null));
		}
	}, [access.kind]);

	useEffect(() => {
		if (refreshKey < 0) return;
		void loadTabCounts();
	}, [loadTabCounts, refreshKey]);

	useEffect(() => {
		if (access.kind !== 'ok') return;

		const onVisibilityOrFocus = () => {
			if (!document.hidden) bumpRefresh();
		};

		window.addEventListener('focus', onVisibilityOrFocus);
		document.addEventListener('visibilitychange', onVisibilityOrFocus);
		const pollId = window.setInterval(() => {
			if (!document.hidden) bumpRefresh();
		}, MANDATES_VISIBLE_POLL_MS);

		return () => {
			window.removeEventListener('focus', onVisibilityOrFocus);
			document.removeEventListener('visibilitychange', onVisibilityOrFocus);
			window.clearInterval(pollId);
		};
	}, [access.kind, bumpRefresh]);

	if (access.kind === 'auth-loading') return <PageSkeleton variant="header-and-tabs" />;
	if (access.kind === 'forbidden') return <Navigate to="/" replace />;
	if (access.kind === 'redirect') return <Navigate to={access.to} replace />;

	const onTabChange = (tab: MandatesTabId) => {
		navigate(resolveMandatesTabRoute(tab));
	};

	const onReconcile = async () => {
		setReconciling(true);
		try {
			const { data, error } = await supabase.functions.invoke('reconcile-stripe-mandates', { body: {} });
			if (error) {
				toast.error(await getInvokeErrorMessage(error, { isSiteAdmin }));
				return;
			}
			const summary = parseMandatesReconcileSummary(data);
			if (!summary) {
				toast.error('Kon het sync-resultaat niet lezen');
				return;
			}
			if (summary.error) {
				toast.error(summary.error);
				return;
			}
			toast.success(formatMandatesReconcileToast(summary));
			bumpRefresh();
		} finally {
			setReconciling(false);
		}
	};

	return (
		<div className="space-y-6">
			<PageHeader title={NAV_LABELS.mandates} subtitle={NAV_DESCRIPTIONS.mandates} />
			<PageTabs
				value={activeTab}
				onValueChange={onTabChange}
				isTabId={isMandatesTabId}
				items={buildMandatesTabItems(tabCounts)}
				actions={
					<StripeButton disabled={reconciling} onClick={() => void onReconcile()}>
						Synchroniseer met Stripe
					</StripeButton>
				}
			>
				<PageTabsContent value="active" className="space-y-4">
					<MandatesLifecyclePanel lifecycle="active" refreshToken={refreshKey} />
				</PageTabsContent>
				<PageTabsContent value="canceled" className="space-y-4">
					<MandatesLifecyclePanel lifecycle="canceled" refreshToken={refreshKey} />
				</PageTabsContent>
				<PageTabsContent value="pending" className="space-y-4">
					<MandatesAwaitingPanel inviteSent={true} refreshToken={refreshKey} />
				</PageTabsContent>
				<PageTabsContent value="unsent" className="space-y-4">
					<MandatesAwaitingPanel inviteSent={false} refreshToken={refreshKey} />
				</PageTabsContent>
			</PageTabs>
		</div>
	);
}
