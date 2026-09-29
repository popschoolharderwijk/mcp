import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
	approveDirectDebitBatch,
	createSignedSepaXmlDownloadUrl,
	finalizeDirectDebitBatchAfterXml,
	generateInvoicesForDirectDebitBatch,
	resolveSepaXmlStoragePath,
} from '@/lib/direct-debit/directDebitBatchDetailActionHelpers';
import {
	canEditBatchItemStatus,
	type DirectDebitBatchItemRow,
	parseDirectDebitBatchLoadResult,
} from '@/lib/direct-debit/directDebitBatchDetailHelpers';
import type { BatchItemStatus, DirectDebitBatch } from '@/lib/direct-debit/types';

export function useDirectDebitBatchDetail() {
	const { id } = useParams<{ id: string }>();
	const [batch, setBatch] = useState<DirectDebitBatch | null>(null);
	const [items, setItems] = useState<DirectDebitBatchItemRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);

	const load = useCallback(async () => {
		if (!id) return;
		setLoading(true);
		const [{ data: batchData }, { data: itemsData }] = await Promise.all([
			supabase.from('incasso_batches').select('*').eq('id', id).maybeSingle(),
			supabase
				.from('incasso_batch_items')
				.select('*, profiles!incasso_batch_items_student_user_id_fkey(first_name,last_name,email)')
				.eq('batch_id', id)
				.order('created_at'),
		]);
		const parsed = parseDirectDebitBatchLoadResult(batchData, itemsData);
		setBatch(parsed.batch);
		setItems(parsed.items);
		setLoading(false);
	}, [id]);

	useEffect(() => {
		void load();
	}, [load]);

	const handleBuild = async () => {
		if (!id) return;
		setBusy(true);
		const { data, error } = await supabase.rpc('build_incasso_batch_items', { p_batch_id: id });
		setBusy(false);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success(`${data ?? 0} regels toegevoegd`);
		void load();
	};

	const handleApprove = async () => {
		if (!id) return;
		setBusy(true);
		const approveResult = await approveDirectDebitBatch(supabase, id);
		if (approveResult.ok === false) {
			setBusy(false);
			toast.error(approveResult.error);
			return;
		}

		toast.info('Facturen worden aangemaakt en gemaild...');
		const invoiceResult = await generateInvoicesForDirectDebitBatch(supabase, id);
		setBusy(false);
		if (invoiceResult.ok === false) {
			toast.error(invoiceResult.error);
			void load();
			return;
		}
		toast.success(invoiceResult.message);
		void load();
	};

	const downloadXml = async (path: string) => {
		const result = await createSignedSepaXmlDownloadUrl(supabase, path);
		if (result.ok === false) {
			toast.error(result.error);
			return;
		}
		window.open(result.signedUrl, '_blank');
	};

	const handleGenerateXml = async () => {
		if (!id) return;
		setBusy(true);
		const { data, error } = await supabase.functions.invoke('generate-sepa-xml', {
			body: { batch_id: id },
		});
		setBusy(false);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success('XML gegenereerd');
		await finalizeDirectDebitBatchAfterXml(supabase, id);
		void load();
		const path = resolveSepaXmlStoragePath(data);
		if (path) await downloadXml(path);
	};

	const handleUpdateItemStatus = async (itemId: string, status: BatchItemStatus) => {
		const { error } = await supabase
			.from('incasso_batch_items')
			.update({ status, status_updated_at: new Date().toISOString() })
			.eq('id', itemId);
		if (error) {
			toast.error(error.message);
			return;
		}
		void load();
	};

	const handleClose = async () => {
		if (!id) return;
		const { error } = await supabase
			.from('incasso_batches')
			.update({ status: 'closed', closed_at: new Date().toISOString() })
			.eq('id', id);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success('Batch afgerond');
		void load();
	};

	const itemStatusEditable = batch ? canEditBatchItemStatus(batch.status) : false;

	return {
		batch,
		items,
		loading,
		busy,
		itemStatusEditable,
		handleBuild,
		handleApprove,
		handleGenerateXml,
		handleUpdateItemStatus,
		handleClose,
		downloadXml,
	};
}
