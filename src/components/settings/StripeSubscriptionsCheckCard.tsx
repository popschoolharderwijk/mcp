import { useState } from 'react';
import { LuListChecks } from 'react-icons/lu';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { formatCentsNl, formatDateNl } from '@/lib/billing/lessonFeeFormat';
import {
	checkStripeSubscriptions,
	SUBSCRIPTION_CHECK_LABELS,
	type SubscriptionCheckResult,
	summarizeSubscriptionCheck,
} from '@/lib/billing/stripeSubscriptionCheck';

function variant(status: SubscriptionCheckResult['status']) {
	if (status === 'mismatch' || status === 'error') return 'destructive' as const;
	if (status === 'ok') return 'default' as const;
	return 'outline' as const;
}

const columns: DataTableColumn<SubscriptionCheckResult>[] = [
	{ key: 'lesson_agreement_id', label: 'Overeenkomst', render: (r) => r.lesson_agreement_id.slice(0, 8) },
	{ key: 'month', label: 'Maand', render: (r) => (r.month ? formatDateNl(r.month) : '—') },
	{
		key: 'expected_cents',
		label: 'Volgens tarief',
		render: (r) => (r.expected_cents == null ? '—' : formatCentsNl(r.expected_cents)),
	},
	{
		key: 'stripe_cents',
		label: 'In Stripe',
		render: (r) => (r.stripe_cents == null ? '—' : formatCentsNl(r.stripe_cents)),
	},
	{
		key: 'status',
		label: 'Status',
		render: (r) => (
			<Badge variant={variant(r.status)} title={r.error}>
				{SUBSCRIPTION_CHECK_LABELS[r.status]}
			</Badge>
		),
	},
];

export function StripeSubscriptionsCheckCard() {
	const [rows, setRows] = useState<SubscriptionCheckResult[]>([]);
	const [checking, setChecking] = useState(false);
	const [notice, setNotice] = useState<string | null>(null);

	const handleCheck = async () => {
		setChecking(true);
		const result = await checkStripeSubscriptions();
		setChecking(false);
		if (!result) {
			toast.error('Controle van de abonnementen mislukt');
			return;
		}
		setRows(result.results);
		setNotice(summarizeSubscriptionCheck(result));
	};

	return (
		<Card>
			<CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
				<div className="space-y-1.5">
					<CardTitle>Stripe-abonnementen</CardTitle>
					<CardDescription>
						Vergelijkt per abonnement het bedrag van de volgende afschrijving met het tarief in de app.
					</CardDescription>
				</div>
				<Button onClick={handleCheck} disabled={checking} variant="outline">
					<LuListChecks className="mr-2 h-4 w-4" />
					{checking ? 'Bezig…' : 'Controleer abonnementen'}
				</Button>
			</CardHeader>
			<CardContent className="space-y-3">
				{notice && <p className="text-sm text-muted-foreground">{notice}</p>}
				<DataTable
					data={rows}
					columns={columns}
					loading={false}
					getRowKey={(r) => r.lesson_agreement_id}
					emptyMessage="Nog niet gecontroleerd"
				/>
			</CardContent>
		</Card>
	);
}
