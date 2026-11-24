import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { missingSiteBaseUrlResponse, resolveSiteBaseUrl } from '../_shared/http.ts';
import { sendSignupConfirmEmail } from '../_shared/signup/mail.ts';
import { resolveSignupMailRecipientEmail } from '../_shared/signup/mailHelpers.ts';
import { generateUrlToken, hashUrlToken } from '../_shared/tokenCryptoHelpers.ts';
import { buildInsertPayload } from './lessonValidation.ts';
import { isSignupSubmitRateLimited, recordSignupSubmitAttempt } from './rateLimit.ts';
import { resolveSignupClientIp, signupConfirmationExpiresAt } from './rateLimitHelpers.ts';
import {
	buildSignupCaptchaFailedResponse,
	buildSignupInsertErrorResponse,
	buildSignupMailFailedResponse,
	buildSignupRateLimitedResponse,
	buildSignupSuccessResponse,
	parseSignupRequestBody,
	readSignupCaptchaToken,
	readSignupServiceEnv,
	resolveSignupMethodResponse,
} from './submitSignupRequestHelpers.ts';
import { verifyTurnstileToken } from './turnstileVerify.ts';
import type { SignupRequest } from './types.ts';
import { validateLessonSelection } from './validateLessonSelection.ts';
import { validateBasicFields } from './validation.ts';

type SignupClient = ReturnType<typeof createClient>;

type SignupBasicsResult = { ok: false; response: Response } | { ok: true; body: SignupRequest; captchaToken: string };

type SignupValidationResult =
	| { ok: false; response: Response }
	| { ok: true; body: SignupRequest; optionId: string | null; captchaToken: string };

type PreparedSubmit =
	| { ok: false; response: Response }
	| {
			ok: true;
			supabase: SignupClient;
			validated: Extract<SignupValidationResult, { ok: true }>;
			siteUrl: string;
			clientIp: string | null;
			recipientEmail: string;
	  };

type SubmitBootstrap =
	| { ok: false; response: Response }
	| {
			ok: true;
			supabase: SignupClient;
			basics: Extract<SignupBasicsResult, { ok: true }>;
			siteUrl: string;
			turnstileSecret: string;
	  };

type SubmitAccessGate =
	| { ok: false; response: Response }
	| {
			ok: true;
			clientIp: string | null;
			recipientEmail: string;
			optionId: string | null;
	  };

function validateSubmitSignupBasics(rawBody: unknown): SignupBasicsResult {
	const body = rawBody as SignupRequest & { captchaToken?: unknown };
	const captchaToken = readSignupCaptchaToken(body);
	if (!captchaToken) return { ok: false, response: buildSignupCaptchaFailedResponse() };

	const basicError = validateBasicFields(body);
	if (basicError) return { ok: false, response: basicError };

	return { ok: true, body, captchaToken };
}

async function verifySubmitTurnstile(
	turnstileSecret: string,
	captchaToken: string,
	clientIp: string | null,
): Promise<Response | null> {
	const turnstileOk = await verifyTurnstileToken({
		secret: turnstileSecret,
		token: captchaToken,
		remoteip: clientIp,
	});
	if (!turnstileOk) return buildSignupCaptchaFailedResponse();
	return null;
}

async function resolveSubmitBootstrap(req: Request): Promise<SubmitBootstrap> {
	const parsed = await parseSignupRequestBody(req);
	if (!parsed.ok) return parsed;

	const siteUrl = resolveSiteBaseUrl(req);
	if (!siteUrl) return { ok: false, response: missingSiteBaseUrlResponse() };

	const env = readSignupServiceEnv((key) => Deno.env.get(key));
	const supabase = createClient(env.supabaseUrl, env.serviceKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	});

	const basics = validateSubmitSignupBasics(parsed.body);
	if (!basics.ok) return basics;

	return { ok: true, supabase, basics, siteUrl, turnstileSecret: env.turnstileSecret };
}

async function resolveSubmitAccessGate(
	supabase: SignupClient,
	turnstileSecret: string,
	basics: Extract<SignupBasicsResult, { ok: true }>,
	req: Request,
): Promise<SubmitAccessGate> {
	const clientIp = resolveSignupClientIp(req.headers);
	const recipientEmail = resolveSignupMailRecipientEmail(basics.body);

	const turnstileDenied = await verifySubmitTurnstile(turnstileSecret, basics.captchaToken, clientIp);
	if (turnstileDenied) return { ok: false, response: turnstileDenied };

	const lessonResult = await validateLessonSelection(supabase, basics.body);
	if (!lessonResult.ok) return { ok: false, response: lessonResult.response };

	if (await isSignupSubmitRateLimited(supabase, recipientEmail, clientIp)) {
		return { ok: false, response: buildSignupRateLimitedResponse() };
	}

	return { ok: true, clientIp, recipientEmail, optionId: lessonResult.optionId };
}

async function prepareSubmitSignupRequest(req: Request): Promise<PreparedSubmit> {
	const bootstrap = await resolveSubmitBootstrap(req);
	if (!bootstrap.ok) return bootstrap;

	const gate = await resolveSubmitAccessGate(bootstrap.supabase, bootstrap.turnstileSecret, bootstrap.basics, req);
	if (!gate.ok) return gate;

	return {
		ok: true,
		supabase: bootstrap.supabase,
		validated: {
			ok: true,
			body: bootstrap.basics.body,
			optionId: gate.optionId,
			captchaToken: bootstrap.basics.captchaToken,
		},
		siteUrl: bootstrap.siteUrl,
		clientIp: gate.clientIp,
		recipientEmail: gate.recipientEmail,
	};
}

async function insertAwaitingSignupRequest(
	supabase: SignupClient,
	validated: Extract<SignupValidationResult, { ok: true }>,
): Promise<{ ok: true; id: string; rawToken: string } | { ok: false; response: Response }> {
	const rawToken = generateUrlToken();
	const tokenHash = await hashUrlToken(rawToken);
	const { data, error } = await supabase
		.from('lesson_signup_requests')
		.insert(
			buildInsertPayload(validated.body, validated.optionId, {
				tokenHash,
				expiresAt: signupConfirmationExpiresAt(),
			}),
		)
		.select('id')
		.single();

	if (error) {
		console.error('signup insert error', {
			message: error.message,
			code: error.code,
			details: error.details,
			hint: error.hint,
		});
		return { ok: false, response: buildSignupInsertErrorResponse(error) };
	}
	return { ok: true, id: data.id, rawToken };
}

async function finalizeSubmitSignupRequest(
	supabase: SignupClient,
	req: Request,
	validated: Extract<SignupValidationResult, { ok: true }>,
	siteUrl: string,
	clientIp: string | null,
	recipientEmail: string,
): Promise<Response> {
	await recordSignupSubmitAttempt(supabase, recipientEmail, clientIp);

	const inserted = await insertAwaitingSignupRequest(supabase, validated);
	if (!inserted.ok) return inserted.response;

	const mail = await sendSignupConfirmEmail(
		supabase,
		req,
		validated.body,
		validated.optionId,
		siteUrl,
		inserted.rawToken,
	);
	if (!mail.ok) {
		console.error('signup_confirm mail failed after insert', mail);
		await supabase.from('lesson_signup_requests').delete().eq('id', inserted.id);
		return buildSignupMailFailedResponse();
	}

	return buildSignupSuccessResponse();
}

export async function handleSubmitSignupRequest(req: Request): Promise<Response> {
	const methodResponse = resolveSignupMethodResponse(req.method);
	if (methodResponse) return methodResponse;

	const prepared = await prepareSubmitSignupRequest(req);
	if (!prepared.ok) return prepared.response;

	return finalizeSubmitSignupRequest(
		prepared.supabase,
		req,
		prepared.validated,
		prepared.siteUrl,
		prepared.clientIp,
		prepared.recipientEmail,
	);
}
