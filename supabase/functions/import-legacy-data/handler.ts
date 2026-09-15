import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type * as XLSX from 'npm:xlsx@0.18.5';
import { corsHeaders } from '../_shared/cors.ts';
import { getSafeErrorMessage } from '../_shared/errors.ts';
import { createLegacyImportAdminClient, createLegacyImportUserClient } from './importClients.ts';
import {
	buildLegacyImportResultResponse,
	buildLegacyImportValidateResponse,
	isAuthenticatedLegacyImportUser,
	isLegacyImportAdminRole,
	readLegacyImportEnv,
	resolveLegacyImportAction,
	resolveLegacyImportAuthHeader,
	resolveLegacyImportForbiddenError,
	resolveLegacyImportInvalidTokenError,
	resolveLegacyImportMissingFileError,
	resolveLegacyImportUnknownActionError,
	resolveLegacyImportValidationFailedError,
} from './importLegacyHandlerPure.ts';
import type { ImportSummary, LegacyImportBody, RowError, Tab } from './types.ts';
import { TABS } from './types.ts';

function json(body: unknown, status = 200, extra: HeadersInit = {}) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extra },
	});
}

function base64ToUint8Array(b64: string): Uint8Array {
	const bin = atob(b64);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

async function requireImportAdmin(
	req: Request,
): Promise<{ ok: true; userId: string; admin: SupabaseClient } | { ok: false; response: Response }> {
	const header = resolveLegacyImportAuthHeader(req.headers.get('Authorization'));
	if (!header.ok) return { ok: false, response: json({ error: header.error }, header.status) };
	return authenticateLegacyImportAdmin(header.authHeader);
}

async function authenticateLegacyImportAdmin(
	authHeader: string,
): Promise<{ ok: true; userId: string; admin: SupabaseClient } | { ok: false; response: Response }> {
	const env = readLegacyImportEnv((key) => Deno.env.get(key));
	const userClient = createLegacyImportUserClient(env.supabaseUrl, env.anonKey, authHeader);
	const {
		data: { user },
		error: authErr,
	} = await userClient.auth.getUser();
	if (!isAuthenticatedLegacyImportUser(user, authErr)) {
		const err = resolveLegacyImportInvalidTokenError();
		return { ok: false, response: json({ error: err.error }, err.status) };
	}

	const { data: roleRow } = await userClient.from('user_roles').select('role').eq('user_id', user.id).single();
	if (!isLegacyImportAdminRole(roleRow?.role)) {
		const err = resolveLegacyImportForbiddenError();
		return { ok: false, response: json({ error: err.error }, err.status) };
	}

	return { ok: true, userId: user.id, admin: createLegacyImportAdminClient(env.supabaseUrl, env.serviceKey) };
}

export interface LegacyImportHandlerDeps {
	buildTemplate: () => Uint8Array;
	validateWorkbook: (wb: XLSX.WorkBook) => { rows: Record<Tab, unknown[]>; errors: RowError[] };
	runEntityImports: (
		admin: SupabaseClient,
		rows: Record<Tab, unknown[]>,
		userId: string,
	) => Promise<{ summaries: ImportSummary[]; errors: RowError[] }>;
}

export async function handleLegacyImportRequest(req: Request, deps: LegacyImportHandlerDeps): Promise<Response> {
	try {
		const auth = await requireImportAdmin(req);
		if (!auth.ok) return auth.response;
		return await dispatchLegacyImportRequest(req, deps, auth);
	} catch (err) {
		console.error('[import-legacy-data]', err);
		return json({ error: getSafeErrorMessage(err) }, 500);
	}
}

async function dispatchLegacyImportRequest(
	req: Request,
	deps: LegacyImportHandlerDeps,
	auth: { userId: string; admin: SupabaseClient },
): Promise<Response> {
	const body: LegacyImportBody = req.method === 'GET' ? { action: 'template' } : await req.json();
	const action = resolveLegacyImportAction(req.method, body.action);

	if (action === 'template') return buildLegacyImportTemplateResponse(deps.buildTemplate());
	if (action === 'unknown') {
		const err = resolveLegacyImportUnknownActionError();
		return json({ error: err.error }, err.status);
	}
	return processLegacyImportWorkbook(deps, auth, body, action);
}

function buildLegacyImportTemplateResponse(bytes: Uint8Array): Response {
	return new Response(bytes, {
		headers: {
			...corsHeaders,
			// octet-stream so supabase.functions.invoke parses the body as a Blob
			'Content-Type': 'application/octet-stream',
			'Content-Disposition': 'attachment; filename="legacy-import-template.xlsx"',
		},
	});
}

async function processLegacyImportWorkbook(
	deps: LegacyImportHandlerDeps,
	auth: { userId: string; admin: SupabaseClient },
	body: LegacyImportBody,
	action: 'validate' | 'import',
): Promise<Response> {
	if (!body.file_base64) {
		const err = resolveLegacyImportMissingFileError();
		return json({ error: err.error }, err.status);
	}

	const XLSX = await import('npm:xlsx@0.18.5');
	const wb = XLSX.read(base64ToUint8Array(body.file_base64), { type: 'array' });
	const { rows, errors } = deps.validateWorkbook(wb);
	const counts = Object.fromEntries(TABS.map((t) => [t, (rows[t] as unknown[]).length])) as Record<Tab, number>;

	if (action === 'validate') return json(buildLegacyImportValidateResponse(errors, counts));
	if (errors.length > 0) {
		const err = resolveLegacyImportValidationFailedError(errors);
		return json({ error: err.error, errors: err.errors }, err.status);
	}

	const importResult = await deps.runEntityImports(auth.admin, rows, auth.userId);
	return json(buildLegacyImportResultResponse(importResult.errors, importResult.summaries, counts));
}
