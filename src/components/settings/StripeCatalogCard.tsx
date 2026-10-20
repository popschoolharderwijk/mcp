import { useCallback, useEffect, useState } from 'react';
import { LuRefreshCw } from 'react-icons/lu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { supabase } from '@/integrations/supabase/client';
import {
	resolveStripeCatalogStatus,
	STRIPE_CATALOG_STATUS_LABELS,
	type StripeCatalogStatusKey,
} from '@/lib/billing/stripeCatalogStatus';
import { syncStripeCatalog } from '@/lib/billing/syncStripeCatalog';
import { formatDateTimeShort } from '@/lib/date/date-format';

interface OverviewRow {
	id: string;
	name: string;
	status: StripeCatalogStatusKey;
	priceCount: number;
	lastSyncedAt: string | null;
	error: string | null;
}

const FREQUENCY: Record<string, string> = {
	daily: 'dagelijks',
	weekly: 'wekelijks',
	biweekly: 'tweewekelijks',
	monthly: 'maandelijks',
};

function statusVariant(status: StripeCatalogStatusKey) {
	if (status === 'error') return 'destructive' as const;
	if (status === 'in_sync') return 'default' as const;
	return 'outline' as const;
}

async function loadOverview(): Promise<OverviewRow[]> {
	const [{ data: options }, { data: catalog }] = await Promise.all([
		supabase
			.from('lesson_type_options')
			.select(
				'id, duration_minutes, frequency, label, billing_kind, lesson_types(name, is_active), lesson_type_option_tariffs(id)',
			),
		supabase
			.from('stripe_catalog_products')
			.select(
				'lesson_type_option_id, stripe_product_id, is_active_in_stripe, sync_status, last_synced_at, last_error, stripe_catalog_prices(is_active_in_stripe)',
			),
	]);
	const byOption = new Map((catalog ?? []).map((c) => [c.lesson_type_option_id, c]));
	return (options ?? []).map((o) => {
		const row = byOption.get(o.id) ?? null;
		const lessonType = o.lesson_types as { name: string; is_active: boolean } | null;
		const parts = [lessonType?.name ?? 'Lessoort'];
		if (o.billing_kind === 'one_off') parts.push('eenmalig');
		else parts.push(`${o.duration_minutes} min`, FREQUENCY[o.frequency] ?? o.frequency);
		if (o.label) parts.push(o.label);
		return {
			id: o.id,
			name: parts.join(' · '),
			status: resolveStripeCatalogStatus({
				hasTariff: (o.lesson_type_option_tariffs ?? []).length > 0,
				lessonTypeActive: lessonType?.is_active ?? false,
				row,
			}),
			priceCount: (row?.stripe_catalog_prices ?? []).filter((p) => p.is_active_in_stripe).length,
			lastSyncedAt: row?.last_synced_at ?? null,
			error: row?.last_error ?? null,
		};
	});
}

const columns: DataTableColumn<OverviewRow>[] = [
	{ key: 'name', label: 'Lesvorm', sortable: true },
	{
		key: 'status',
		label: 'Status',
		render: (r) => (
			<Badge variant={statusVariant(r.status)} title={r.error ?? undefined}>
				{STRIPE_CATALOG_STATUS_LABELS[r.status]}
			</Badge>
		),
	},
	{ key: 'priceCount', label: 'Actieve prijzen' },
	{
		key: 'lastSyncedAt',
		label: 'Laatste sync',
		render: (r) => (r.lastSyncedAt ? formatDateTimeShort(new Date(r.lastSyncedAt)) : '—'),
	},
	{ key: 'error', label: 'Fout', render: (r) => <span className="text-sm text-destructive">{r.error ?? ''}</span> },
];

export function StripeCatalogCard() {
	const [rows, setRows] = useState<OverviewRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [syncing, setSyncing] = useState(false);
	const [notice, setNotice] = useState<string | null>(null);

	const reload = useCallback(async () => {
		setLoading(true);
		setRows(await loadOverview());
		setLoading(false);
	}, []);

	useEffect(() => {
		void reload();
	}, [reload]);

	const handleSync = async () => {
		setSyncing(true);
		const result = await syncStripeCatalog();
		setNotice(result && !result.configured ? (result.message ?? null) : null);
		setSyncing(false);
		await reload();
	};

	return (
		<Card>
			<CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
				<div className="space-y-1.5">
					<CardTitle>Stripe-catalogus</CardTitle>
					<CardDescription>
						Lesvormen en tarieven gaan automatisch naar Stripe. Beheer prijzen alleen hier in de app.
					</CardDescription>
				</div>
				<Button onClick={handleSync} disabled={syncing}>
					<LuRefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
					{syncing ? 'Bezig…' : 'Synchroniseer met Stripe'}
				</Button>
			</CardHeader>
			<CardContent className="space-y-3">
				{notice && <p className="text-sm text-muted-foreground">{notice}</p>}
				<DataTable
					data={rows}
					columns={columns}
					loading={loading}
					getRowKey={(r) => r.id}
					emptyMessage="Geen lesvormen gevonden"
					initialSortColumn="name"
					initialSortDirection="asc"
				/>
			</CardContent>
		</Card>
	);
}
