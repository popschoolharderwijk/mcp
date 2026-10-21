import { useCallback, useEffect, useState } from 'react';
import { LuMail } from 'react-icons/lu';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { PageShell } from '@/components/ui/page-shell';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { NAV_LABELS } from '@/config/nav-labels';
import { useAuth } from '@/hooks/useAuth';
import { useResendPaymentInvite } from '@/hooks/useResendPaymentInvite';
import { formatDbDateToUi } from '@/lib/date/date-format';
import { type AwaitingMandateRow, sortByLongestWaiting } from '@/lib/subscriptions/awaitingMandate';
import { fetchAwaitingMandates } from '@/lib/subscriptions/awaitingMandateLoad';

const COLUMNS: DataTableColumn<AwaitingMandateRow>[] = [
	{
		key: 'student_name',
		label: 'Leerling',
		sortable: true,
		sortValue: (r) => r.student_name ?? '',
		render: (r) => (
			<Link to={`/agreements/${r.lesson_agreement_id}`} className="font-medium text-primary hover:underline">
				{r.student_name ?? 'Onbekend'}
			</Link>
		),
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
		label: 'Verstuurd op',
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

export default function AwaitingMandate() {
	const { isPrivileged, isLoading } = useAuth();
	const [rows, setRows] = useState<AwaitingMandateRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState('');

	const load = useCallback(async () => {
		setLoading(true);
		try {
			setRows(sortByLongestWaiting(await fetchAwaitingMandates()));
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Kon het overzicht niet laden');
		}
		setLoading(false);
	}, []);
	const { busyId, resend } = useResendPaymentInvite(() => void load());

	useEffect(() => {
		if (!isLoading && isPrivileged) void load();
	}, [isLoading, isPrivileged, load]);

	if (isLoading) return <PageSkeleton />;
	if (!isPrivileged) return <Navigate to="/" replace />;

	const q = search.trim().toLowerCase();
	const filtered = q
		? rows.filter((r) =>
				[r.student_name, r.recipient_email, r.lesson_type_name].some((v) => v?.toLowerCase().includes(q)),
			)
		: rows;

	return (
		<PageShell
			title={NAV_LABELS.awaitingMandate}
			description="Overeenkomsten met automatische incasso waarvoor nog geen machtiging is afgegeven. Lessen gaan gewoon door."
		>
			<DataTable
				data={filtered}
				columns={COLUMNS}
				loading={loading}
				searchQuery={search}
				onSearchChange={setSearch}
				getRowKey={(r) => r.lesson_agreement_id}
				emptyMessage="Er wacht niemand op een machtiging."
				initialSortColumn="days_waiting"
				initialSortDirection="desc"
				rowActions={{
					render: (r) => (
						<Button
							size="sm"
							variant="outline"
							disabled={busyId !== null}
							onClick={() => void resend(r.lesson_agreement_id)}
						>
							<LuMail className="mr-1.5 h-4 w-4" /> Opnieuw versturen
						</Button>
					),
				}}
			/>
		</PageShell>
	);
}
