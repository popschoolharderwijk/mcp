import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LegacyImportFilePickerProps {
	file: File | null;
	busy: boolean;
	onFileChange: (file: File | null) => void;
}

export function LegacyImportFilePicker({ file, busy, onFileChange }: LegacyImportFilePickerProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);

	return (
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
				<Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={busy}>
					Bestand kiezen
				</Button>
				<span className="text-sm text-muted-foreground">{file?.name ?? 'Geen bestand gekozen'}</span>
			</div>
		</div>
	);
}
