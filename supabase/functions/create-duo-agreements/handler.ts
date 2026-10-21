import { jsonResponse } from '../_shared/http.ts';
import { authenticateCreateDuoRequest } from './createDuoAgreementsHandlerPure.ts';
import { createDuoPair } from './createDuoPair.ts';
import { sendDuoConfirmationEmails } from './sendDuoConfirmationEmails.ts';

export async function handleCreateDuoAgreementsRequest(req: Request): Promise<Response> {
	const auth = await authenticateCreateDuoRequest(req);
	if (!auth.ok) return auth.response;

	const created = await createDuoPair(auth.admin, auth.body);
	if (!created.ok) return created.response;

	for (const [userId, dateOfBirth] of [
		[auth.body.student_user_id_a, auth.body.date_of_birth_a],
		[auth.body.student_user_id_b, auth.body.date_of_birth_b],
	]) {
		if (userId && dateOfBirth)
			await auth.admin
				.from('students')
				.update({ date_of_birth: dateOfBirth })
				.eq('user_id', userId)
				.is('date_of_birth', null);
	}
	const confirmationSent = await sendDuoConfirmationEmails(
		auth.admin,
		req,
		auth.body,
		new Map([
			[auth.body.student_user_id_a, created.agreementIds[0]],
			[auth.body.student_user_id_b, created.agreementIds[1]],
		]),
	);

	return jsonResponse(200, {
		ok: true,
		duo_pair_id: created.duoPairId,
		agreement_ids: created.agreementIds,
		confirmation_sent: confirmationSent,
	});
}
