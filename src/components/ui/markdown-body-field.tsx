import type { Ref } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { renderMarkdown } from '@/lib/markdown/render';
import { cn } from '@/lib/utils';

const MARKDOWN_PANEL_CLASSES = 'min-h-[12.5rem] max-h-[28rem] overflow-y-auto';
const MARKDOWN_EDITOR_CLASSES = cn(
	'font-mono text-sm h-auto w-full resize-none [field-sizing:content]',
	MARKDOWN_PANEL_CLASSES,
);

interface MarkdownBodyFieldProps {
	id: string;
	label?: string;
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
	rows?: number;
	placeholder?: string;
	/** Optional preview source (e.g. with template variables filled). Defaults to `value`. */
	previewSource?: string;
	showPreview?: boolean;
	/** `beside` puts preview next to the editor on large screens. Default `below`. */
	previewPlacement?: 'below' | 'beside';
	textareaRef?: Ref<HTMLTextAreaElement>;
}

function MarkdownPreviewPanel({ preview, className }: { preview: string; className?: string }) {
	return (
		<div className={cn('rounded-md border border-border bg-muted/30 p-3 overflow-y-auto', className)}>
			{preview.trim().length > 0 ? (
				renderMarkdown(preview)
			) : (
				<p className="text-sm text-muted-foreground">Nog geen inhoud.</p>
			)}
		</div>
	);
}

/** Shared markdown textarea + live preview (announcements / email templates). */
export function MarkdownBodyField({
	id,
	label = 'Inhoud (Markdown)',
	value,
	onChange,
	disabled = false,
	rows = 10,
	placeholder = 'Gebruik **vet**, *cursief*, lijsten (- item) en [link](url).',
	previewSource,
	showPreview = true,
	previewPlacement = 'below',
	textareaRef,
}: MarkdownBodyFieldProps) {
	const preview = previewSource ?? value;
	const beside = previewPlacement === 'beside' && showPreview;

	if (beside) {
		return (
			<div className="grid grid-cols-1 gap-x-4 gap-y-2 lg:grid-cols-2 lg:items-stretch">
				<Label htmlFor={id} className="lg:col-start-1 lg:row-start-1">
					{label}
				</Label>
				<Label className="hidden lg:col-start-2 lg:row-start-1 lg:block">Voorvertoning</Label>

				<Textarea
					id={id}
					ref={textareaRef}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					disabled={disabled}
					rows={rows}
					placeholder={placeholder}
					className={cn(MARKDOWN_EDITOR_CLASSES, 'lg:col-start-1 lg:row-start-2')}
				/>
				<div className="flex min-h-[12.5rem] max-h-[28rem] flex-col gap-2 lg:col-start-2 lg:row-start-2 lg:h-full">
					<Label className="shrink-0 lg:hidden">Voorvertoning</Label>
					<MarkdownPreviewPanel preview={preview} className="min-h-0 flex-1" />
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor={id}>{label}</Label>
				<Textarea
					id={id}
					ref={textareaRef}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					disabled={disabled}
					rows={rows}
					placeholder={placeholder}
					className={MARKDOWN_EDITOR_CLASSES}
				/>
			</div>
			{showPreview && (
				<div className="space-y-2">
					<Label>Voorvertoning</Label>
					<MarkdownPreviewPanel preview={preview} className={MARKDOWN_PANEL_CLASSES} />
				</div>
			)}
		</div>
	);
}
