import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { type StripeCatalogSyncResponse, summarizeStripeCatalogSync } from '@/lib/billing/stripeCatalogStatus';

/** Calls sync-stripe-catalog. Never throws: Stripe problems must not block saving lesson types. */
export async function syncStripeCatalog(lessonTypeId?: string): Promise<StripeCatalogSyncResponse | null> {
	try {
		const { data, error } = await supabase.functions.invoke<StripeCatalogSyncResponse>('sync-stripe-catalog', {
			body: lessonTypeId ? { lesson_type_id: lessonTypeId } : {},
		});
		if (error || !data) {
			toast.error('Synchronisatie met Stripe mislukt');
			return null;
		}
		const summary = summarizeStripeCatalogSync(data);
		if (summary.kind === 'error') toast.error(summary.message);
		else if (summary.kind === 'info') toast.info(summary.message);
		else toast.success(summary.message);
		return data;
	} catch (err) {
		console.error('sync-stripe-catalog failed', err);
		toast.error('Synchronisatie met Stripe mislukt');
		return null;
	}
}
