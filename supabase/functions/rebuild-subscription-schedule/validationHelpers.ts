import { jsonResponse, UUID_RE } from '../_shared/http.ts';

export interface RebuildScheduleBody {
	lesson_agreement_id?: string;
	lesson_type_id?: string;
}

export function validateRebuildScheduleBody(body: RebuildScheduleBody): Response | null {
	if (body.lesson_agreement_id && !UUID_RE.test(body.lesson_agreement_id)) {
		return jsonResponse(400, { error: 'Ongeldig lesson_agreement_id' });
	}
	if (body.lesson_type_id && !UUID_RE.test(body.lesson_type_id)) {
		return jsonResponse(400, { error: 'Ongeldig lesson_type_id' });
	}
	if (!body.lesson_agreement_id && !body.lesson_type_id) {
		return jsonResponse(400, { error: 'Geef lesson_agreement_id of lesson_type_id mee' });
	}
	return null;
}

export function buildRebuildScheduleResponse(
	results: Array<{ lesson_agreement_id: string; ok: boolean; detail?: unknown; error?: string }>,
) {
	const failed = results.filter((result) => !result.ok).length;
	return {
		status: failed === results.length && results.length > 0 ? 500 : 200,
		body: {
			processed: results.length,
			failed,
			results,
		},
	};
}

export function buildRebuildScheduleSuccessResult(lessonAgreementId: string, detail: unknown) {
	return { lesson_agreement_id: lessonAgreementId, ok: true as const, detail };
}

export function buildRebuildScheduleFailureResult(lessonAgreementId: string, error: string) {
	return { lesson_agreement_id: lessonAgreementId, ok: false as const, error };
}
