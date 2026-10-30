import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/** Service-role Supabase client for public payment-link edge functions. */
export function createPaymentLinkAdminClient(): SupabaseClient {
	return createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
		auth: { autoRefreshToken: false, persistSession: false },
	});
}
