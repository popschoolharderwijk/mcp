import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
	isSignupEmailRateLimited,
	isSignupIpRateLimited,
	normalizeSignupRateLimitEmail,
	shouldEnforceSignupIpRateLimit,
	signupSubmitWindowStart,
} from './rateLimitHelpers.ts';

async function countRecentSignupAttemptsByEmail(
	admin: SupabaseClient,
	emailNormalized: string,
	sinceIso: string,
): Promise<number> {
	const { count } = await admin
		.from('signup_submit_attempts')
		.select('id', { count: 'exact', head: true })
		.eq('email_normalized', emailNormalized)
		.gte('created_at', sinceIso);
	return count ?? 0;
}

async function countRecentSignupAttemptsByIp(
	admin: SupabaseClient,
	clientIp: string,
	sinceIso: string,
): Promise<number> {
	const { count } = await admin
		.from('signup_submit_attempts')
		.select('id', { count: 'exact', head: true })
		.eq('client_ip', clientIp)
		.gte('created_at', sinceIso);
	return count ?? 0;
}

export async function isSignupSubmitRateLimited(
	admin: SupabaseClient,
	recipientEmail: string,
	clientIp: string | null,
): Promise<boolean> {
	const since = signupSubmitWindowStart();
	const emailNormalized = normalizeSignupRateLimitEmail(recipientEmail);
	const emailCount = await countRecentSignupAttemptsByEmail(admin, emailNormalized, since);
	if (isSignupEmailRateLimited(emailCount)) return true;
	if (!shouldEnforceSignupIpRateLimit(clientIp)) return false;
	const ipCount = await countRecentSignupAttemptsByIp(admin, clientIp, since);
	return isSignupIpRateLimited(ipCount);
}

export async function recordSignupSubmitAttempt(
	admin: SupabaseClient,
	recipientEmail: string,
	clientIp: string | null,
): Promise<void> {
	await admin.from('signup_submit_attempts').insert({
		email_normalized: normalizeSignupRateLimitEmail(recipientEmail),
		client_ip: clientIp,
	});
}
