import { LuDownload, LuUpload } from 'react-icons/lu';
import { LegacyImportFilePicker } from '@/components/settings/LegacyImportFilePicker';
import { LegacyImportResultPanel } from '@/components/settings/LegacyImportResultPanel';
import { LegacyImportValidationPanel } from '@/components/settings/LegacyImportValidationPanel';
import { Button } from '@/components/ui/button';
import type { ImportResponse, RowError, ValidationResponse } from '@/lib/settings/legacyImportManagerHelpers';
import { isLegacyImportRunDisabled, isLegacyImportValidateDisabled } from '@/lib/settings/legacyImportManagerUiHelpers';

interface LegacyImportCardContentProps {
	file: File | null;
	busy: boolean;
	validation: ValidationResponse | null;
	importResult: ImportResponse | null;
	onFileChange: (file: File | null) => void;
	onDownloadTemplate: () => void;
	onValidate: () => void;
	onOpenConfirm: () => void;
	onDownloadErrors: (errors: RowError[], name: string) => void;
}

export function LegacyImportCardContent({
	file,
	busy,
	validation,
	importResult,
	onFileChange,
	onDownloadTemplate,
	onValidate,
	onOpenConfirm,
	onDownloadErrors,
}: LegacyImportCardContentProps) {
	return (
		<div className="space-y-6">
			<LegacyImportFilePicker file={file} busy={busy} onFileChange={onFileChange} />

			<div className="flex flex-wrap gap-2">
				<Button type="button" variant="outline" onClick={onDownloadTemplate} disabled={busy}>
					<LuDownload className="mr-2 h-4 w-4" />
					Download template
				</Button>
				<Button type="button" onClick={onValidate} disabled={isLegacyImportValidateDisabled(file, busy)}>
					<LuUpload className="mr-2 h-4 w-4" />
					Valideren
				</Button>
				<Button
					type="button"
					variant="default"
					onClick={onOpenConfirm}
					disabled={isLegacyImportRunDisabled(file, busy, validation)}
				>
					Importeren
				</Button>
			</div>

			{validation && <LegacyImportValidationPanel validation={validation} onDownloadErrors={onDownloadErrors} />}
			{importResult && (
				<LegacyImportResultPanel importResult={importResult} onDownloadErrors={onDownloadErrors} />
			)}
		</div>
	);
}
