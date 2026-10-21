import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { buildInsertPayload } from './lessonValidation.ts';
import { sendSignupConfirmationEmail } from './sendConfirmationEmail.ts';
import {
	buildSignupInsertErrorResponse,
	buildSignupSuccessResponse,
	parseSignupRequestBody,
	readSignupServiceEnv,
	resolveSignupMethodResponse,
	shouldSendSignupConfirmationEmail,
} from './submitSignupRequestPure.ts';
import type { SignupRequest } from './types.ts';
import { validateLessonSelection } from './validateLessonSelection.ts';
import { validateBasicFields } from './validation.ts';

type SignupValidationResult =
	| { ok: false; response: Response }
	| { ok: true; body: SignupRequest; optionId: string | null };

async function validateSubmitSignupRequest(
	supabase: ReturnType<typeof createClient>,
	body: SignupRequest,
): Promise<SignupValidationResult> {
	const basicError = validateBasicFields(body);
	if (basicError) return { ok: false, response: basicError };

	if (body.payment_method !== undefined && body.payment_method !== 'stripe' && body.payment_method !== 'manual')
		return {
			ok: false,
			response: new Response(JSON.stringify({ error: 'Ongeldige betaalmethode' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			}),
		};

	const lessonResult = await validateLessonSelection(supabase, body);
	if (!lessonResult.ok) return { ok: false, response: lessonResult.response };

	return { ok: true, body, optionId: lessonResult.optionId };
}

async function persistSignupRequest(
	supabase: ReturnType<typeof createClient>,
	validated: Extract<SignupValidationResult, { ok: true }>,
): Promise<Response> {
	const { data, error } = await supabase
		.from('lesson_signup_requests')
		.insert(buildInsertPayload(validated.body, validated.optionId))
		.select('id')
		.single();

	if (error) {
		console.error('signup insert error', {
			message: error.message,
			code: error.code,
			details: error.details,
			hint: error.hint,
		});
		return buildSignupInsertErrorResponse(error);
	}

	return buildSignupSuccessResponse(data.id);
}

export async function handleSubmitSignupRequest(req: Request): Promise<Response> {
	const methodResponse = resolveSignupMethodResponse(req.method);
	if (methodResponse) return methodResponse;
	return executeSubmitSignupRequest(req);
}

async function executeSubmitSignupRequest(req: Request): Promise<Response> {
	const parsed = await parseSignupRequestBody(req);
	if (!parsed.ok) return parsed.response;

	const env = readSignupServiceEnv((key) => Deno.env.get(key));
	const supabase = createClient(env.supabaseUrl, env.serviceKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	});

	const validated = await validateSubmitSignupRequest(supabase, parsed.body as SignupRequest);
	if (!validated.ok) return validated.response;

	return finalizeSubmitSignupRequest(supabase, req, validated);
}

async function finalizeSubmitSignupRequest(
	supabase: ReturnType<typeof createClient>,
	req: Request,
	validated: Extract<SignupValidationResult, { ok: true }>,
): Promise<Response> {
	const response = await persistSignupRequest(supabase, validated);
	if (!shouldSendSignupConfirmationEmail(response.status)) return response;

	try {
		await sendSignupConfirmationEmail(supabase, req, validated.body, validated.optionId);
	} catch (mailErr) {
		console.error('signup_received mail exception', mailErr);
	}

	return response;
}
