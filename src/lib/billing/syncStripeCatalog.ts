import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export type StripeCatalogSyncResponse = {
	configured?: boolean;
	message?: string;
	summary?: { synced: number; skipped: number; errors: number; changed: number };
	results?: Array<{ status: string; error?: string }>;
	error?: string;
};

type SyncStripeCatalogOptions = {
	lessonTypeId?: string;
	lessonTypeOptionId?: string;
	rebuild?: boolean;
	unsyncedOnly?: boolean;
	quiet?: boolean;
};

export function summarizeStripeCatalogSync(data: StripeCatalogSyncResponse): {
	kind: 'success' | 'info' | 'error';
	message: string;
} {
	if (data.error) return { kind: 'error', message: data.error };
	if (data.configured === false) {
		return { kind: 'info', message: data.message ?? 'Stripe is nog niet ingesteld' };
	}
	const errors = data.summary?.errors ?? data.results?.filter((r) => r.status === 'error').length ?? 0;
	if (errors > 0) {
		return { kind: 'error', message: `${errors} lesoptie(s) konden niet met Stripe worden gesynchroniseerd` };
	}
	const changed = data.summary?.changed ?? 0;
	if (changed === 0) {
		return { kind: 'info', message: 'Stripe-catalogus is al up-to-date' };
	}
	return { kind: 'success', message: `${changed} lesoptie(s) gesynchroniseerd met Stripe` };
}

function buildSyncStripeCatalogBody(options?: SyncStripeCatalogOptions): Record<string, unknown> {
	const body: Record<string, unknown> = {};
	if (options?.lessonTypeId) body.lesson_type_id = options.lessonTypeId;
	if (options?.lessonTypeOptionId) body.lesson_type_option_id = options.lessonTypeOptionId;
	if (options?.rebuild !== undefined) body.rebuild = options.rebuild;
	if (options?.unsyncedOnly === true) body.unsynced_only = true;
	return body;
}

function notifyStripeCatalogSync(data: StripeCatalogSyncResponse): void {
	const summary = summarizeStripeCatalogSync(data);
	if (summary.kind === 'error') toast.error(summary.message);
	else if (summary.kind === 'info') toast.info(summary.message);
	else toast.success(summary.message);
}

function toastStripeCatalogSyncFailure(quiet?: boolean): void {
	if (!quiet) toast.error('Synchronisatie met Stripe mislukt');
}

/** Calls sync-stripe-catalog. Never throws: Stripe problems must not block saving lesson types. */
export async function syncStripeCatalog(options?: SyncStripeCatalogOptions): Promise<StripeCatalogSyncResponse | null> {
	try {
		const { data, error } = await supabase.functions.invoke<StripeCatalogSyncResponse>('sync-stripe-catalog', {
			body: buildSyncStripeCatalogBody(options),
		});
		if (error || !data) {
			toastStripeCatalogSyncFailure(options?.quiet);
			return null;
		}
		if (!options?.quiet) notifyStripeCatalogSync(data);
		return data;
	} catch (err) {
		console.error('sync-stripe-catalog failed', err);
		toastStripeCatalogSyncFailure(options?.quiet);
		return null;
	}
}
