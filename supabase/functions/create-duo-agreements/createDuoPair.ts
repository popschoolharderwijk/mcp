import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getSafeErrorMessage } from '../_shared/errors.ts';
import { jsonResponse } from '../_shared/http.ts';
import {
	buildDuoPairBasePayload,
	buildDuoPairInsertPayload,
	resolveDuoPairInsertFailureResponse,
	resolveDuoPairInsertOutcome,
} from './createDuoPairHelpers.ts';
import type { Body } from './types.ts';

export async function createDuoPair(
	admin: SupabaseClient,
	body: Body,
): Promise<{ ok: true; duoPairId: string; agreementIds: [string, string] } | { ok: false; response: Response }> {
	const duoPairId = crypto.randomUUID();
	const basePayload = buildDuoPairBasePayload(body, duoPairId);

	const insertA = await admin
		.from('lesson_agreements')
		.insert(buildDuoPairInsertPayload(basePayload, body.student_user_id_a))
		.select('id')
		.single();
	const outcomeA = resolveDuoPairInsertOutcome(insertA.data, insertA.error);
	if (!outcomeA.ok) {
		console.error('Duo create A failed', insertA.error);
		return {
			ok: false,
			response: resolveDuoPairInsertFailureResponse(
				outcomeA.error,
				'Aanmaken overeenkomst A mislukt',
				getSafeErrorMessage,
				jsonResponse,
			),
		};
	}

	const insertB = await admin
		.from('lesson_agreements')
		.insert(buildDuoPairInsertPayload(basePayload, body.student_user_id_b))
		.select('id')
		.single();
	const outcomeB = resolveDuoPairInsertOutcome(insertB.data, insertB.error);
	if (!outcomeB.ok) {
		console.error('Duo create B failed, rolling back A', insertB.error);
		await admin.from('lesson_agreements').delete().eq('id', outcomeA.row.id);
		return {
			ok: false,
			response: resolveDuoPairInsertFailureResponse(
				outcomeB.error,
				'Aanmaken overeenkomst B mislukt',
				getSafeErrorMessage,
				jsonResponse,
			),
		};
	}

	return { ok: true, duoPairId, agreementIds: [outcomeA.row.id, outcomeB.row.id] };
}
