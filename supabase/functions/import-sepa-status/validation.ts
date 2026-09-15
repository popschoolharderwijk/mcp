import { jsonResponse } from '../_shared/http.ts';
import { parsePain002 } from './parsePain002.ts';
import type { ParsedReport } from './types.ts';

export function parseReportOrError(
	xml: string,
): { ok: true; report: ParsedReport } | { ok: false; response: Response } {
	try {
		return { ok: true, report: parsePain002(xml) };
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Onbekende parse-fout';
		return { ok: false, response: jsonResponse(400, { error: `XML ongeldig: ${msg}` }) };
	}
}
