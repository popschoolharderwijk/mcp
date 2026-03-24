import { createClient } from '@supabase/supabase-js';

// WORKAROUND: Lovable platform injects wrong VITE_SUPABASE_URL (fanpqtzdotcqbftykvpk instead of zdvscmogkfyddnnxzkdu).
// Hardcoded until platform bug is resolved. See: https://discord.gg/lovable-dev
const SUPABASE_URL = 'https://zdvscmogkfyddnnxzkdu.supabase.co';
const SUPABASE_KEY =
	import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
	import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkdnNjbW9na2Z5ZGRubnh6a2R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NTI3MzEsImV4cCI6MjA4NDEyODczMX0.3R3pIKT_2w5nGvku9ydWsCBRW3y62n1z1bi4OqJnG_w';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
	auth: {
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: true,
	},
});
