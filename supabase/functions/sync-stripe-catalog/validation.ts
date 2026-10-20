import { jsonResponse, UUID_RE } from '../_shared/http.ts';

export interface SyncCatalogBody {
	lesson_type_id?: string;
}

export function validateSyncCatalogBody(body: SyncCatalogBody | null): Response | null {
	if (body === null || typeof body !== 'object') return jsonResponse(400, { error: 'Ongeldige aanvraag' });
	if (
		body.lesson_type_id !== undefined &&
		(typeof body.lesson_type_id !== 'string' || !UUID_RE.test(body.lesson_type_id))
	) {
		return jsonResponse(400, { error: 'Ongeldig lessoort-id' });
	}
	return null;
}

export const STRIPE_NOT_CONFIGURED_MESSAGE = 'Stripe is nog niet ingesteld (STRIPE_SECRET_KEY ontbreekt)';

export function stripeNotConfiguredResponse(): Response {
	return jsonResponse(200, { configured: false, message: STRIPE_NOT_CONFIGURED_MESSAGE, results: [] });
}
