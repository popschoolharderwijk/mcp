import type { SupabaseClient } from '@supabase/supabase-js';

type Tab = 'lesson_types' | 'lesson_type_options' | 'teachers' | 'students' | 'lesson_agreements';

export interface RowError {
	tab: Tab;
	row: number;
	field?: string;
	message: string;
}

export interface ValidationResponse {
	ok: boolean;
	errors: RowError[];
	counts: Record<Tab, number>;
}

export interface ImportSummary {
	tab: Tab;
	created: number;
	updated: number;
	failed: number;
}

export interface ImportResponse {
	ok: boolean;
	summaries: ImportSummary[];
	errors: RowError[];
	counts: Record<Tab, number>;
}

export function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result as string;
			resolve(result.split(',')[1] ?? '');
		};
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});
}

export function errorsToCsv(errors: RowError[]): string {
	const header = 'tab,row,field,message\n';
	const csvEscape = (v: string) => `"${v.replace(/"/g, '""')}"`;
	return (
		header +
		errors
			.map((error) =>
				[error.tab, error.row, error.field ?? '', error.message].map((v) => csvEscape(String(v))).join(','),
			)
			.join('\n')
	);
}

export function downloadBlobFile(blob: Blob, fileName: string): void {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = fileName;
	anchor.click();
	URL.revokeObjectURL(url);
}

function resolveLegacyImportTemplateBlob(data: unknown): Blob {
	if (data instanceof Blob) return data;
	throw new Error('Onverwacht template-antwoord van import-legacy-data');
}

export async function fetchLegacyImportTemplate(supabase: SupabaseClient): Promise<Blob> {
	const { data, error } = await supabase.functions.invoke('import-legacy-data', {
		body: { action: 'template' },
	});
	if (error) throw error;
	return resolveLegacyImportTemplateBlob(data);
}

export function resolveLegacyValidationToast(data: ValidationResponse | null): {
	kind: 'success' | 'warning';
	message: string;
} {
	if (data?.ok) return { kind: 'success', message: 'Validatie geslaagd — klaar om te importeren' };
	return { kind: 'warning', message: `Validatie meldt ${data?.errors.length ?? 0} fout(en)` };
}

export function resolveLegacyImportToast(data: ImportResponse | null): {
	kind: 'success' | 'warning';
	message: string;
} {
	if (data?.ok) return { kind: 'success', message: 'Import voltooid' };
	return { kind: 'warning', message: `Import voltooid met ${data?.errors.length ?? 0} fout(en)` };
}

export function toErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'Onbekend';
}
