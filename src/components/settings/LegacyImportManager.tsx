import { LegacyImportCardContent } from '@/components/settings/LegacyImportCardContent';
import { LegacyImportConfirmDialog } from '@/components/settings/LegacyImportConfirmDialog';
import { PageShell } from '@/components/ui/page-shell';
import { NAV_LABELS } from '@/config/nav-labels';
import { useLegacyImportManager } from '@/hooks/useLegacyImportManager';

export function LegacyImportManager() {
	const {
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
	} = useLegacyImportManager();

	return (
		<>
			<PageShell title={NAV_LABELS.dataImport} description="Importeer legacy-gegevens via een Excel-bestand">
				<LegacyImportCardContent
					file={file}
					busy={busy}
					validation={validation}
					importResult={importResult}
					onFileChange={handleFileChange}
					onDownloadTemplate={downloadTemplate}
					onValidate={validate}
					onOpenConfirm={() => setConfirmOpen(true)}
					onDownloadErrors={downloadErrors}
				/>
			</PageShell>

			<LegacyImportConfirmDialog
				open={confirmOpen}
				busy={busy}
				onOpenChange={setConfirmOpen}
				onConfirm={runImport}
			/>
		</>
	);
}
