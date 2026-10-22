import { jsonResponse } from '../_shared/http.ts';
import type { Body } from './types.ts';

export function validateImportBody(body: Body): Response | null {
	if (!body.xml) {
		return jsonResponse(400, { error: 'Verplicht veld ontbreekt: xml (pain.002 inhoud)' });
	}
	return null;
}
