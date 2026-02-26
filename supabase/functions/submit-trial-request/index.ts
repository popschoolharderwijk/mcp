// Edge Function to submit a trial lesson request (anon may call).
// Inserts into pending_trial_requests. Rate limit: max 2 requests per email per hour.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const MAX_REQUESTS_PER_EMAIL_PER_HOUR = 2;

interface SubmitTrialRequestBody {
	email: string;
	lesson_type_id: string;
	first_name: string | null;
	last_name: string | null;
}

Deno.serve(async (req) => {
	if (req.method === 'OPTIONS') {
		return new Response(null, { status: 204, headers: corsHeaders });
	}

	if (req.method !== 'POST') {
		return new Response(JSON.stringify({ error: 'Method not allowed' }), {
			status: 405,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}

	try {
		const supabase = createClient(
			Deno.env.get('SUPABASE_URL') ?? '',
			Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
			{ auth: { autoRefreshToken: false, persistSession: false } },
		);

		let body: SubmitTrialRequestBody;
		try {
			body = await req.json();
		} catch {
			return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
		const lesson_type_id = typeof body.lesson_type_id === 'string' ? body.lesson_type_id.trim() : '';
		const first_name = body.first_name != null ? String(body.first_name).trim() || null : null;
		const last_name = body.last_name != null ? String(body.last_name).trim() || null : null;

		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return new Response(JSON.stringify({ error: 'Valid email is required' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}
		if (!lesson_type_id) {
			return new Response(JSON.stringify({ error: 'lesson_type_id is required' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		// Rate limit: count pending requests for this email in the last hour
		const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
		const { count, error: countError } = await supabase
			.from('pending_trial_requests')
			.select('*', { count: 'exact', head: true })
			.eq('email', email)
			.gte('created_at', oneHourAgo);

		if (countError) {
			console.error('Rate limit check failed:', countError);
			return new Response(JSON.stringify({ error: 'Rate limit check failed' }), {
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}
		if ((count ?? 0) >= MAX_REQUESTS_PER_EMAIL_PER_HOUR) {
			return new Response(
				JSON.stringify({
					error: `Maximaal ${MAX_REQUESTS_PER_EMAIL_PER_HOUR} proeflesaanvragen per uur per e-mailadres. Probeer het later opnieuw.`,
					code: 'rate_limit',
				}),
				{
					status: 429,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				},
			);
		}

		// Ensure lesson_type exists and is active
		const { data: lt, error: ltError } = await supabase
			.from('lesson_types')
			.select('id')
			.eq('id', lesson_type_id)
			.eq('is_active', true)
			.single();

		if (ltError || !lt) {
			return new Response(JSON.stringify({ error: 'Ongeldige of inactieve lessoort' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		const { error: insertError } = await supabase.from('pending_trial_requests').insert({
			email,
			lesson_type_id,
			first_name: first_name || null,
			last_name: last_name || null,
		});

		if (insertError) {
			console.error('Insert pending_trial_requests failed:', insertError);
			return new Response(JSON.stringify({ error: 'Aanvraag kon niet worden opgeslagen' }), {
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('submit-trial-request error:', err);
		return new Response(JSON.stringify({ error: 'Internal server error' }), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}
});
