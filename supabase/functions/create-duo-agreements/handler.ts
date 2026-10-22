import { jsonResponse } from '../_shared/http.ts';
import { authenticateCreateDuoRequest } from './createDuoAgreementsHandlerHelpers.ts';
import { createDuoPair } from './createDuoPair.ts';
import { sendDuoConfirmationEmails } from './sendDuoConfirmationEmails.ts';

export async function handleCreateDuoAgreementsRequest(req: Request): Promise<Response> {
	const auth = await authenticateCreateDuoRequest(req);
	if (!auth.ok) return auth.response;

	const created = await createDuoPair(auth.admin, auth.body);
	if (!created.ok) return created.response;

	await sendDuoConfirmationEmails(auth.admin, req, auth.body);

	return jsonResponse(200, {
		ok: true,
		duo_pair_id: created.duoPairId,
		agreement_ids: created.agreementIds,
	});
}
