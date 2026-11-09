import { jsonResponse, UUID_RE } from '../_shared/http.ts';

export interface SyncCatalogBody {
	lesson_type_id?: string;
	lesson_type_option_id?: string;
	/** When true (default if lesson_type_id set), rebuild affected subscription schedules. */
	rebuild?: boolean;
}

export function validateSyncCatalogBody(body: SyncCatalogBody | null): Response | null {
	if (body === null || typeof body !== 'object') return jsonResponse(400, { error: 'Ongeldige aanvraag' });
	if (
		body.lesson_type_id !== undefined &&
		(typeof body.lesson_type_id !== 'string' || !UUID_RE.test(body.lesson_type_id))
	) {
		return jsonResponse(400, { error: 'Ongeldig lessoort-id' });
	}
	if (
		body.lesson_type_option_id !== undefined &&
		(typeof body.lesson_type_option_id !== 'string' || !UUID_RE.test(body.lesson_type_option_id))
	) {
		return jsonResponse(400, { error: 'Ongeldig lesoptie-id' });
	}
	return null;
}

export function stripeNotConfiguredResponse(): Response {
	return jsonResponse(200, {
		configured: false,
		message: 'Stripe is nog niet ingesteld (STRIPE_SECRET_KEY ontbreekt)',
		results: [],
		rebuilds: [],
	});
}

export function shouldRebuildAfterCatalogSync(body: SyncCatalogBody): boolean {
	if (body.rebuild === false) return false;
	if (body.rebuild === true) return true;
	return Boolean(body.lesson_type_id || body.lesson_type_option_id);
}

export function pickLessonTypeIdForRebuild(
	body: SyncCatalogBody,
	optionLessonTypeId: string | null | undefined,
): string | null {
	if (body.lesson_type_id) return body.lesson_type_id;
	return optionLessonTypeId ?? null;
}
