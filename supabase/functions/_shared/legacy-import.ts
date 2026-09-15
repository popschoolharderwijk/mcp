import type { SupabaseClient } from '@supabase/supabase-js';

export { resolveLegacyPersonUserId } from './legacyImportPure.ts';

interface ImportSummary {
	tab: string;
	created: number;
	updated: number;
	failed: number;
}

export async function saveLegacyMapping(
	admin: SupabaseClient,
	entity: string,
	legacyId: string,
	newId: string,
	importedBy: string | null,
): Promise<void> {
	const { error } = await admin
		.from('legacy_ids')
		.upsert(
			{ entity_type: entity, legacy_id: legacyId, new_id: newId, imported_by: importedBy },
			{ onConflict: 'entity_type,legacy_id' },
		);
	if (error) throw error;
}

export async function upsertMappedEntity<TPayload extends Record<string, unknown>>(options: {
	admin: SupabaseClient;
	table: string;
	entityType: string;
	legacyId: string;
	mapping: Map<string, string>;
	importedBy: string | null;
	payload: TPayload;
	summary: ImportSummary;
}): Promise<void> {
	const { admin, table, entityType, legacyId, mapping, importedBy, payload, summary } = options;
	const existingId = mapping.get(legacyId);
	if (existingId) {
		const { error } = await admin.from(table).update(payload).eq('id', existingId);
		if (error) throw error;
		summary.updated++;
		return;
	}

	const { data, error } = await admin.from(table).insert(payload).select('id').single();
	if (error) throw error;
	await saveLegacyMapping(admin, entityType, legacyId, data.id, importedBy);
	mapping.set(legacyId, data.id);
	summary.created++;
}
