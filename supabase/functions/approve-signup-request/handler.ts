import { beginAuthenticatedPostRequest, jsonResponse } from '../_shared/http.ts';
import { getSiteBaseUrl } from '../_shared/http-serve.ts';
import { sendAgreementConfirmation } from '../_shared/sendAgreementConfirmation.ts';
import { createSupabaseClients, requireAdminUser } from '../_shared/supabase.ts';
import { buildApproveSignupSuccessPayload, resolveTargetGroupId } from './approveSignupRequestPure.ts';
import { enrollGroupSignup } from './enrollGroupSignup.ts';
import { ensureStudentFromSignup } from './ensureStudentFromSignup.ts';
import { loadSignupRequest } from './loadSignupRequest.ts';
import type { Body, SignupRequestRow } from './types.ts';
import { validateApproveBody } from './validation.ts';

async function enrollApprovedGroupSignup(
	admin: ReturnType<typeof createSupabaseClients>['admin'],
	args: {
		reqRow: SignupRequestRow;
		studentUserId: string;
		targetGroupId: string;
		processedBy: string;
	},
): Promise<{ ok: true; createdAgreementId: string | null; isNew: boolean } | { ok: false; response: Response }> {
	const enrolled = await enrollGroupSignup(admin, args);
	if (!enrolled.ok) return enrolled;
	return { ok: true, createdAgreementId: enrolled.createdAgreementId, isNew: enrolled.isNew };
}

async function enrollIfTargetGroup(
	admin: ReturnType<typeof createSupabaseClients>['admin'],
	targetGroupId: string | null,
	args: {
		reqRow: SignupRequestRow;
		studentUserId: string;
		processedBy: string;
	},
): Promise<{ ok: true; createdAgreementId: string | null; isNew: boolean } | { ok: false; response: Response }> {
	if (!targetGroupId) return { ok: true, createdAgreementId: null, isNew: false };

	const enrolled = await enrollApprovedGroupSignup(admin, {
		reqRow: args.reqRow,
		studentUserId: args.studentUserId,
		targetGroupId,
		processedBy: args.processedBy,
	});
	if (!enrolled.ok) return enrolled;
	return { ok: true, createdAgreementId: enrolled.createdAgreementId, isNew: enrolled.isNew };
}

async function processApproveSignupRequest(
	admin: ReturnType<typeof createSupabaseClients>['admin'],
	body: Body,
	processedBy: string,
	req: Request,
): Promise<Response> {
	const loaded = await loadSignupRequest(admin, body.request_id);
	if (!loaded.ok) return loaded.response;

	const ensured = await ensureStudentFromSignup(admin, loaded.row);
	if (!ensured.ok) return ensured.response;

	const targetGroupId = resolveTargetGroupId(body.override_lesson_group_id, loaded.row.lesson_group_id);
	const enrollment = await enrollIfTargetGroup(admin, targetGroupId, {
		reqRow: loaded.row,
		studentUserId: ensured.studentUserId,
		processedBy,
	});
	if (!enrollment.ok) return enrollment.response;

	const confirmationSent =
		enrollment.isNew && enrollment.createdAgreementId
			? await sendAgreementConfirmation(enrollment.createdAgreementId, {
					admin,
					siteUrl: getSiteBaseUrl(req),
					origin: req.headers.get('origin'),
					sentBy: processedBy,
				})
			: true;
	return jsonResponse(200, {
		confirmation_sent: confirmationSent,
		...buildApproveSignupSuccessPayload({
			studentUserId: ensured.studentUserId,
			createdAgreementId: enrollment.createdAgreementId,
			targetGroupId,
		}),
	});
}

async function executeApproveSignupRequest(authHeader: string, body: Body, req: Request): Promise<Response> {
	const validationError = validateApproveBody(body);
	if (validationError) return validationError;

	const { userClient, admin } = createSupabaseClients(authHeader);
	const authn = await requireAdminUser(userClient);
	if (!authn.ok) return authn.response;

	return processApproveSignupRequest(admin, body, authn.user.id, req);
}

export async function handleApproveSignupRequest(req: Request): Promise<Response> {
	const begun = await beginAuthenticatedPostRequest<Body>(req);
	if (!begun.ok) return begun.response;
	return executeApproveSignupRequest(begun.authHeader, begun.body, req);
}
