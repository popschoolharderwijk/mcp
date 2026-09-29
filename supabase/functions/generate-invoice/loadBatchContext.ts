import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse } from '../_shared/http.ts';
import { buildBatchContextFromLoadedData, extractMandateIds, hasBatchItems } from './loadBatchContextPure.ts';
import type { AccountingSettings, BatchItem, DirectDebitBatch, ProfileRow, StudentRow } from './types.ts';

export interface BatchContext {
	settings: AccountingSettings;
	batch: DirectDebitBatch;
	items: BatchItem[];
	studentIds: string[];
	profileMap: Map<string, ProfileRow>;
	studentMap: Map<string, StudentRow>;
	mandateMap: Map<string, string>;
}

async function loadAccountingSettings(
	admin: SupabaseClient,
): Promise<{ ok: true; settings: AccountingSettings } | { ok: false; response: Response }> {
	const { data, error } = await admin.from('accounting_settings').select('*').eq('id', true).maybeSingle();
	if (error || !data) {
		return { ok: false, response: jsonResponse(500, { error: 'Accounting-instellingen ontbreken' }) };
	}
	return { ok: true, settings: data as AccountingSettings };
}

async function loadDirectDebitBatch(
	admin: SupabaseClient,
	batchId: string,
): Promise<{ ok: true; batch: DirectDebitBatch } | { ok: false; response: Response }> {
	const { data, error } = await admin.from('incasso_batches').select('*').eq('id', batchId).maybeSingle();
	if (error || !data) {
		return { ok: false, response: jsonResponse(404, { error: 'Batch niet gevonden' }) };
	}
	return { ok: true, batch: data as DirectDebitBatch };
}

async function loadBatchItems(
	admin: SupabaseClient,
	batchId: string,
): Promise<{ ok: true; items: BatchItem[] } | { ok: false; response: Response }> {
	const { data, error } = await admin
		.from('incasso_batch_items')
		.select('id, student_user_id, amount_cents, remittance_info, lesson_agreement_id, mandate_id')
		.eq('batch_id', batchId);
	if (error || !hasBatchItems(data)) {
		return { ok: false, response: jsonResponse(400, { error: 'Geen regels in deze batch' }) };
	}
	return { ok: true, items: data as BatchItem[] };
}

async function loadBatchRelatedMaps(admin: SupabaseClient, items: BatchItem[]) {
	const studentIds = [...new Set(items.map((item) => item.student_user_id))];
	const mandateIds = extractMandateIds(items);
	const [{ data: profiles }, { data: students }, { data: mandates }] = await Promise.all([
		admin.from('profiles').select('user_id, first_name, last_name, email').in('user_id', studentIds),
		admin
			.from('students')
			.select(
				'user_id, date_of_birth, parent_email, parent_name, debtor_info_same_as_student, debtor_name, debtor_address, debtor_postal_code, debtor_city',
			)
			.in('user_id', studentIds),
		admin.from('sepa_mandates').select('id, mandate_reference').in('id', mandateIds),
	]);
	return {
		profiles: (profiles ?? []) as ProfileRow[],
		students: (students ?? []) as StudentRow[],
		mandates: mandates ?? [],
	};
}

export async function loadBatchContext(
	admin: SupabaseClient,
	batchId: string,
): Promise<{ ok: true; context: BatchContext } | { ok: false; response: Response }> {
	const settingsLoaded = await loadAccountingSettings(admin);
	if (!settingsLoaded.ok) return settingsLoaded;

	const batchLoaded = await loadDirectDebitBatch(admin, batchId);
	if (!batchLoaded.ok) return batchLoaded;

	const itemsLoaded = await loadBatchItems(admin, batchId);
	if (!itemsLoaded.ok) return itemsLoaded;

	const relatedMaps = await loadBatchRelatedMaps(admin, itemsLoaded.items);
	return {
		ok: true,
		context: buildBatchContextFromLoadedData({
			settings: settingsLoaded.settings,
			batch: batchLoaded.batch,
			items: itemsLoaded.items,
			profiles: relatedMaps.profiles,
			students: relatedMaps.students,
			mandates: relatedMaps.mandates,
		}),
	};
}
