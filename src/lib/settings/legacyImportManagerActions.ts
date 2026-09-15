import type { SupabaseClient } from '@supabase/supabase-js';
import {
	downloadBlobFile,
	fetchLegacyImportTemplate,
	fileToBase64,
	type ImportResponse,
	resolveLegacyImportToast,
	resolveLegacyValidationToast,
	toErrorMessage,
	type ValidationResponse,
} from '@/lib/settings/legacyImportManagerHelpers';

export type LegacyImportActionResult<T> =
	| { ok: true; data: T; toast?: { kind: 'success' | 'warning'; message: string } }
	| { ok: false; message: string; title: string };

export async function runLegacyImportTemplateDownload(
	supabase: SupabaseClient,
): Promise<LegacyImportActionResult<null>> {
	try {
		const {
			data: { session },
		} = await supabase.auth.getSession();
		if (!session?.access_token) throw new Error('Niet ingelogd');

		const blob = await fetchLegacyImportTemplate(supabase);
		downloadBlobFile(blob, 'legacy-import-template.xlsx');
		return { ok: true, data: null };
	} catch (error) {
		return { ok: false, title: 'Kon template niet downloaden', message: toErrorMessage(error) };
	}
}

async function runLegacyImportValidationBase64(
	supabase: SupabaseClient,
	fileBase64: string,
): Promise<LegacyImportActionResult<ValidationResponse | null>> {
	try {
		const { data, error } = await supabase.functions.invoke<ValidationResponse>('import-legacy-data', {
			body: { action: 'validate', file_base64: fileBase64 },
		});
		if (error) throw error;
		const toastResult = resolveLegacyValidationToast(data ?? null);
		return { ok: true, data: data ?? null, toast: toastResult };
	} catch (error) {
		return { ok: false, title: 'Validatie mislukt', message: toErrorMessage(error) };
	}
}

export async function runLegacyImportValidation(
	supabase: SupabaseClient,
	file: File,
): Promise<LegacyImportActionResult<ValidationResponse | null>> {
	const fileBase64 = await fileToBase64(file);
	return runLegacyImportValidationBase64(supabase, fileBase64);
}

async function runLegacyImportExecutionBase64(
	supabase: SupabaseClient,
	fileBase64: string,
): Promise<LegacyImportActionResult<ImportResponse | null>> {
	try {
		const { data, error } = await supabase.functions.invoke<ImportResponse>('import-legacy-data', {
			body: { action: 'import', file_base64: fileBase64 },
		});
		if (error) throw error;
		const toastResult = resolveLegacyImportToast(data ?? null);
		return { ok: true, data: data ?? null, toast: toastResult };
	} catch (error) {
		return { ok: false, title: 'Import mislukt', message: toErrorMessage(error) };
	}
}

export async function runLegacyImportExecution(
	supabase: SupabaseClient,
	file: File,
): Promise<LegacyImportActionResult<ImportResponse | null>> {
	const fileBase64 = await fileToBase64(file);
	return runLegacyImportExecutionBase64(supabase, fileBase64);
}
