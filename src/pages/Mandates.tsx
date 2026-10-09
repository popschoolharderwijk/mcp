import { useCallback, useEffect, useState } from 'react';
import { LuPlus } from 'react-icons/lu';
import { toast } from 'sonner';
import { AdminSiteGuard } from '@/components/auth/AdminSiteGuard';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageShell } from '@/components/ui/page-shell';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserSelectSingle } from '@/components/ui/user-select';
import { NAV_LABELS } from '@/config/nav-labels';
import { supabase } from '@/integrations/supabase/client';
import {
	executeNewMandateCreate,
	resolveHolderFromStudentSelection,
	resolveMandateValidationToast,
} from '@/lib/direct-debit/mandateCreateHelpers';
import { firstMandateProfile, mandateListProfileName } from '@/lib/direct-debit/mandateDisplayHelpers';
import { type MandateListRow, mandateListQuery } from '@/lib/direct-debit/mandateListQuery';
import { buildMandateColumns } from '@/lib/direct-debit/mandateTableColumns';

const MANDATE_COLUMNS = buildMandateColumns();

export default function Mandates() {
	return (
		<AdminSiteGuard>
			<MandatesContent />
		</AdminSiteGuard>
	);
}

function MandatesContent() {
	const [rows, setRows] = useState<MandateListRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState('');
	const [dialogOpen, setDialogOpen] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		const { data, error } = await mandateListQuery(supabase);
		if (error) toast.error(error.message);
		setRows(data ?? []);
		setLoading(false);
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const handleDelete = async (id: string) => {
		if (!confirm('Mandaat verwijderen?')) return;
		const { error } = await supabase.from('sepa_mandates').delete().eq('id', id);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success('Verwijderd');
		load();
	};

	return (
		<PageShell
			title={NAV_LABELS.mandates}
			description="Beheer SEPA-mandaten van leerlingen"
			actions={
				<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
					<DialogTrigger asChild>
						<Button>
							<LuPlus className="h-4 w-4 mr-2" /> Nieuw mandaat
						</Button>
					</DialogTrigger>
					<NewMandateDialog
						onClose={() => setDialogOpen(false)}
						onCreated={() => {
							setDialogOpen(false);
							load();
						}}
					/>
				</Dialog>
			}
		>
			<DataTable
				data={rows}
				columns={MANDATE_COLUMNS}
				searchQuery={search}
				onSearchChange={setSearch}
				searchPlaceholder="Zoek op kenmerk, leerling of IBAN..."
				searchFields={[
					(mandate) => mandate.mandate_reference,
					(mandate) => mandate.iban,
					(mandate) => mandate.account_holder,
					(mandate) => mandateListProfileName(mandate.profiles),
					(mandate) => firstMandateProfile(mandate.profiles)?.email,
				]}
				loading={loading}
				getRowKey={(mandate) => mandate.id}
				emptyMessage="Nog geen mandaten"
				rowActions={{ onDelete: (mandate) => handleDelete(mandate.id) }}
			/>
		</PageShell>
	);
}

function NewMandateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
	const [studentId, setStudentId] = useState<string | null>(null);
	const [iban, setIban] = useState('');
	const [bic, setBic] = useState('');
	const [holder, setHolder] = useState('');
	const [signedAt, setSignedAt] = useState(new Date().toISOString().slice(0, 10));
	const [method, setMethod] = useState<'digital' | 'paper'>('paper');
	const [saving, setSaving] = useState(false);

	const handleSubmit = async () => {
		setSaving(true);
		const result = await executeNewMandateCreate(supabase, {
			studentId,
			iban,
			bic,
			holder,
			signedAt,
			method,
		});
		setSaving(false);

		if (result.ok === false) {
			if (result.kind === 'validation') toast.error(resolveMandateValidationToast(result.error));
			else if (result.kind === 'reference') toast.error(`Kenmerk genereren mislukt: ${result.message}`);
			else toast.error(result.message);
			return;
		}

		toast.success('Mandaat aangemaakt');
		onCreated();
	};

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle>Nieuw SEPA-mandaat</DialogTitle>
				<DialogDescription>Het mandaatkenmerk wordt automatisch gegenereerd.</DialogDescription>
			</DialogHeader>
			<div className="space-y-3">
				<div className="space-y-1.5">
					<Label>Leerling</Label>
					<UserSelectSingle
						value={studentId}
						onChange={(u) => {
							setStudentId(u?.user_id ?? null);
							setHolder((current) =>
								resolveHolderFromStudentSelection(current, u?.first_name, u?.last_name),
							);
						}}
						filter="students"
						placeholder="Kies leerling..."
					/>
				</div>
				<div className="space-y-1.5">
					<Label>IBAN</Label>
					<Input value={iban} onChange={(e) => setIban(e.target.value)} placeholder="NL00BANK0123456789" />
				</div>
				<div className="space-y-1.5">
					<Label>BIC (optioneel)</Label>
					<Input value={bic} onChange={(e) => setBic(e.target.value)} placeholder="BANKNL2A" />
				</div>
				<div className="space-y-1.5">
					<Label>Rekeninghouder</Label>
					<Input value={holder} onChange={(e) => setHolder(e.target.value)} />
				</div>
				<div className="grid grid-cols-2 gap-3">
					<div className="space-y-1.5">
						<Label>Ondertekend op</Label>
						<Input type="date" value={signedAt} onChange={(e) => setSignedAt(e.target.value)} />
					</div>
					<div className="space-y-1.5">
						<Label>Wijze</Label>
						<Select value={method} onValueChange={(v) => setMethod(v as 'digital' | 'paper')}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="paper">Papier</SelectItem>
								<SelectItem value="digital">Digitaal</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>
			<DialogFooter>
				<Button variant="outline" onClick={onClose}>
					Annuleren
				</Button>
				<Button onClick={handleSubmit} disabled={saving}>
					{saving ? 'Opslaan...' : 'Aanmaken'}
				</Button>
			</DialogFooter>
		</DialogContent>
	);
}
