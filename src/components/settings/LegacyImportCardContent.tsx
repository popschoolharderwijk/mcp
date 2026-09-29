import { useRef } from 'react';
import { LuDownload, LuUpload } from 'react-icons/lu';
import { LegacyImportResultPanel } from '@/components/settings/LegacyImportResultPanel';
import { LegacyImportValidationPanel } from '@/components/settings/LegacyImportValidationPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
	const fileInputRef = useRef<HTMLInputElement>(null);

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<Label htmlFor="legacy-file">Excel-bestand (.xlsx)</Label>
				<div className="flex flex-wrap items-center gap-3">
					<Input
						ref={fileInputRef}
						id="legacy-file"
						type="file"
						accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
						onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
						disabled={busy}
						className="hidden"
					/>
					<Button
						type="button"
						variant="outline"
						onClick={() => fileInputRef.current?.click()}
						disabled={busy}
					>
						Bestand kiezen
					</Button>
					<span className="text-sm text-muted-foreground">{file?.name ?? 'Geen bestand gekozen'}</span>
				</div>
			</div>

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
