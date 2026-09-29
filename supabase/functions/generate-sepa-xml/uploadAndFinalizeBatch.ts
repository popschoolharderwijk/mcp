import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHash } from 'node:crypto';
import { jsonResponse } from '../_shared/http.ts';
import type { BatchRow, ItemRow } from './types.ts';

export async function uploadAndFinalizeBatch(
	admin: SupabaseClient,
	args: {
		batchId: string;
		batch: BatchRow;
		items: ItemRow[];
		xml: string;
		msgId: string;
	},
): Promise<Response> {
	const hash = createHash('sha256').update(args.xml).digest('hex');
	const path = `${args.batch.batch_number}/${args.msgId}.xml`;

	const { error: upErr } = await admin.storage
		.from('sepa-batches')
		.upload(path, new Blob([args.xml], { type: 'application/xml' }), {
			contentType: 'application/xml',
			upsert: true,
		});
	if (upErr) return jsonResponse(500, { error: `Upload mislukt: ${upErr.message}` });

	await promoteFirstUseMandates(admin, args.items);

	await admin
		.from('direct_debit_batches')
		.update({
			message_id: args.msgId,
			xml_storage_path: path,
			xml_sha256: hash,
		})
		.eq('id', args.batchId);

	return jsonResponse(200, { ok: true, storage_path: path, message_id: args.msgId, sha256: hash });
}

async function promoteFirstUseMandates(admin: SupabaseClient, items: ItemRow[]): Promise<void> {
	const mandateIdsFRST = items.filter((i) => i.sequence_type === 'FRST').map((i) => i.mandate_id);
	if (mandateIdsFRST.length === 0) return;
	await admin
		.from('sepa_mandates')
		.update({ first_used_at: new Date().toISOString(), sequence_type: 'RCUR' })
		.in('id', mandateIdsFRST);
}
