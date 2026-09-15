import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { runLegacyImportAction } from '@/lib/settings/legacyImportManagerActionHelpers';
import {
	runLegacyImportExecution,
	runLegacyImportTemplateDownload,
	runLegacyImportValidation,
} from '@/lib/settings/legacyImportManagerActions';
import {
	downloadBlobFile,
	errorsToCsv,
	type ImportResponse,
	type RowError,
	type ValidationResponse,
} from '@/lib/settings/legacyImportManagerHelpers';

export function useLegacyImportManager() {
	const [file, setFile] = useState<File | null>(null);
	const [busy, setBusy] = useState(false);
	const [validation, setValidation] = useState<ValidationResponse | null>(null);
	const [importResult, setImportResult] = useState<ImportResponse | null>(null);
	const [confirmOpen, setConfirmOpen] = useState(false);

	function handleFileChange(selectedFile: File | null) {
		setFile(selectedFile);
		setValidation(null);
		setImportResult(null);
	}

	function downloadErrors(errors: RowError[], name: string) {
		downloadBlobFile(new Blob([errorsToCsv(errors)], { type: 'text/csv' }), name);
	}

	async function downloadTemplate() {
		setBusy(true);
		const result = await runLegacyImportTemplateDownload(supabase);
		if (result.ok === false) toast.error(result.title, { description: result.message });
		setBusy(false);
	}

	async function validate() {
		if (!file) return;
		setBusy(true);
		setValidation(null);
		setImportResult(null);
		await runLegacyImportAction(
			() => runLegacyImportValidation(supabase, file),
			(data) => setValidation(data),
		);
		setBusy(false);
	}

	async function runImport() {
		if (!file) return;
		setBusy(true);
		setImportResult(null);
		await runLegacyImportAction(
			() => runLegacyImportExecution(supabase, file),
			(data) => setImportResult(data),
		);
		setBusy(false);
		setConfirmOpen(false);
	}

	return {
		file,
		busy,
		validation,
		importResult,
		confirmOpen,
		setConfirmOpen,
		handleFileChange,
		downloadErrors,
		downloadTemplate,
		validate,
		runImport,
	};
}
