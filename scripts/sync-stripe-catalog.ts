/**
 * Push active lesson_type_options to Stripe Products/Prices via sync-stripe-catalog.
 * Use after `supabase db reset` (or when the catalog drifted).
 *
 * Requires in env:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   STRIPE_SECRET_KEY (on the edge function runtime / project secrets)
 *
 * Optional args:
 *   --lesson-type-id <uuid>
 *   --no-rebuild
 *
 * Run: bun run stripe:sync-catalog
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
	throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
}

function readArg(flag: string): string | undefined {
	const idx = process.argv.indexOf(flag);
	if (idx < 0) return undefined;
	return process.argv[idx + 1];
}

const lessonTypeId = readArg('--lesson-type-id');
const noRebuild = process.argv.includes('--no-rebuild');

const body: Record<string, unknown> = {};
if (lessonTypeId) body.lesson_type_id = lessonTypeId;
if (noRebuild) body.rebuild = false;
else if (!lessonTypeId) body.rebuild = false;

const url = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/sync-stripe-catalog`;
const response = await fetch(url, {
	method: 'POST',
	headers: {
		Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
		apikey: SUPABASE_SERVICE_ROLE_KEY,
		'Content-Type': 'application/json',
	},
	body: JSON.stringify(body),
});

const text = await response.text();
let payload: unknown = text;
try {
	payload = JSON.parse(text);
} catch {
	// keep raw text
}

if (!response.ok) {
	console.error('sync-stripe-catalog failed', response.status, payload);
	process.exit(1);
}

console.log(JSON.stringify(payload, null, 2));
