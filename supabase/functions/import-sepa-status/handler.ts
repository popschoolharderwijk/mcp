import { jsonResponse } from '../_shared/http.ts';
import { applyStatusReport, buildImportResponse, findBatchForReport } from './applyStatusReport.ts';
import { authorizeImportSepaStatusRequest } from './importSepaStatusHandlerPure.ts';
import { parseReportOrError } from './validation.ts';

type AuthorizedImport = Extract<Awaited<ReturnType<typeof authorizeImportSepaStatusRequest>>, { ok: true }>;

async function runImportSepaStatusPipeline(
	authorized: AuthorizedImport,
): Promise<{ ok: true; response: Response } | { ok: false; response: Response }> {
	const parsed = parseReportOrError(authorized.body.xml as string);
	if (!parsed.ok) return { ok: false, response: parsed.response };

	const batchLookup = await findBatchForReport(authorized.admin, parsed.report, authorized.body.batch_id);
	if (!batchLookup.ok) return { ok: false, response: batchLookup.response };

	const applied = await applyStatusReport(authorized.admin, batchLookup.batch, parsed.report);
	if (!applied.ok) return { ok: false, response: applied.response };

	return {
		ok: true,
		response: jsonResponse(200, buildImportResponse(batchLookup.batch, parsed.report, applied.result)),
	};
}

export async function handleImportSepaStatusRequest(req: Request): Promise<Response> {
	const authorized = await authorizeImportSepaStatusRequest(req);
	if (!authorized.ok) return authorized.response;

	const pipeline = await runImportSepaStatusPipeline(authorized);
	return pipeline.response;
}
