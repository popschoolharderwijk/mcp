import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse } from '../_shared/http.ts';
import {
	normalizeSepaSettings,
	resolveSepaBatchItemsFailure,
	resolveSepaBatchLoadFailure,
	resolveSepaBatchStatusFailure,
	resolveSepaSettingsIncomplete,
	resolveSepaSettingsLoadFailure,
} from './loadSepaXmlContextPure.ts';
import type { BatchRow, ItemRow, SepaXmlContext, SettingsRow } from './types.ts';

export async function loadSepaXmlContext(
	admin: SupabaseClient,
	batchId: string,
): Promise<{ ok: true; context: SepaXmlContext } | { ok: false; response: Response }> {
	const settingsResult = await loadSettings(admin);
	if (!settingsResult.ok) return settingsResult;

	const batchResult = await loadBatch(admin, batchId);
	if (!batchResult.ok) return batchResult;

	const itemsResult = await loadBatchItems(admin, batchId);
	if (!itemsResult.ok) return itemsResult;

	return {
		ok: true,
		context: {
			settings: settingsResult.settings,
			batch: batchResult.batch,
			items: itemsResult.items,
		},
	};
}

async function loadSettings(
	admin: SupabaseClient,
): Promise<{ ok: true; settings: SepaXmlContext['settings'] } | { ok: false; response: Response }> {
	const { data: settings, error: sErr } = await admin
		.from('accounting_settings')
		.select('sepa_creditor_name, sepa_creditor_iban, sepa_creditor_bic, sepa_creditor_id')
		.eq('id', true)
		.maybeSingle();

	const loadFailure = resolveSepaSettingsLoadFailure(settings as SettingsRow | null, sErr?.message);
	if (loadFailure) return { ok: false, response: jsonResponse(loadFailure.status, { error: loadFailure.error }) };

	const incomplete = resolveSepaSettingsIncomplete(settings as SettingsRow);
	if (incomplete) return { ok: false, response: jsonResponse(incomplete.status, { error: incomplete.error }) };

	return { ok: true, settings: normalizeSepaSettings(settings as SettingsRow) };
}

async function loadBatch(
	admin: SupabaseClient,
	batchId: string,
): Promise<{ ok: true; batch: BatchRow } | { ok: false; response: Response }> {
	const { data: batch, error: bErr } = await admin
		.from('direct_debit_batches')
		.select('id, batch_number, status, collection_date, message_id, xml_storage_path')
		.eq('id', batchId)
		.maybeSingle();

	const loadFailure = resolveSepaBatchLoadFailure(batch as BatchRow | null, bErr?.message);
	if (loadFailure) return { ok: false, response: jsonResponse(loadFailure.status, { error: loadFailure.error }) };

	const statusFailure = resolveSepaBatchStatusFailure(batch as BatchRow);
	if (statusFailure)
		return { ok: false, response: jsonResponse(statusFailure.status, { error: statusFailure.error }) };

	return { ok: true, batch: batch as BatchRow };
}

async function loadBatchItems(
	admin: SupabaseClient,
	batchId: string,
): Promise<{ ok: true; items: ItemRow[] } | { ok: false; response: Response }> {
	const { data: itemsData, error: iErr } = await admin
		.from('direct_debit_batch_items')
		.select(
			'id, mandate_id, amount_cents, currency, end_to_end_id, remittance_info, sequence_type, sepa_mandates!direct_debit_batch_items_mandate_id_fkey(mandate_reference,iban,bic,account_holder,signed_at)',
		)
		.eq('batch_id', batchId)
		.order('created_at');

	const itemsFailure = resolveSepaBatchItemsFailure((itemsData ?? []) as ItemRow[], iErr?.message);
	if (itemsFailure) return { ok: false, response: jsonResponse(itemsFailure.status, { error: itemsFailure.error }) };

	return { ok: true, items: itemsData as ItemRow[] };
}
