import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const MANDATE_LIST_SELECT =
	'*, profiles!sepa_mandates_student_user_id_fkey(first_name,last_name,email,avatar_url)' as const;

export function mandateListQuery(client: SupabaseClient<Database>) {
	return client.from('sepa_mandates').select(MANDATE_LIST_SELECT).order('created_at', { ascending: false });
}

export type MandateListRow = NonNullable<Awaited<ReturnType<typeof mandateListQuery>>['data']>[number];
