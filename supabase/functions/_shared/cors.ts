/**
 * Shared CORS headers for all Edge Functions.
 * Based on Supabase's recommended CORS setup for browser invocations.
 * @see https://supabase.com/docs/guides/functions/cors
 *
 * FIXME: Voor productie deployment, vervang '*' door specifieke domeinen:
 * - https://yourdomain.com
 * - https://www.yourdomain.com
 * Dit voorkomt CSRF-style attacks en beperkt de attack surface.
 */
export const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
