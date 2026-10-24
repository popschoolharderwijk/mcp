import { type MutableRefObject, type Ref, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { renderMarkdown } from '@/lib/markdown/render';
import { cn } from '@/lib/utils';

const MARKDOWN_PANEL_MIN_PX = 200;
const MARKDOWN_PANEL_MAX_PX = 448; // 28rem

/** Shared pixel height for editor + preview: taller content wins, within min/max. */
function resolveMatchedMarkdownPanelHeight(editorScrollHeight: number, previewScrollHeight: number): number {
	return Math.min(
		MARKDOWN_PANEL_MAX_PX,
		Math.max(MARKDOWN_PANEL_MIN_PX, Math.max(editorScrollHeight, previewScrollHeight)),
	);
}

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

function MarkdownPreviewPanel({
	preview,
	className,
	panelRef,
	style,
}: {
	preview: string;
	className?: string;
	panelRef?: Ref<HTMLDivElement>;
	style?: React.CSSProperties;
}) {
	return (
		<div
			ref={panelRef}
			style={style}
			className={cn('rounded-md border border-border bg-muted/30 p-3 overflow-y-auto', className)}
		>
			{preview.trim().length > 0 ? (
				renderMarkdown(preview)
			) : (
				<p className="text-sm text-muted-foreground">Nog geen inhoud.</p>
			)}
		</div>
	);
}

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
	if (!ref) return;
	if (typeof ref === 'function') {
		ref(node);
		return;
	}
	(ref as MutableRefObject<T | null>).current = node;
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
	const editorRef = useRef<HTMLTextAreaElement>(null);
	const previewRef = useRef<HTMLDivElement>(null);

	const syncMatchedHeights = useCallback(() => {
		const editor = editorRef.current;
		const previewEl = previewRef.current;
		if (!editor || !previewEl) return;
		editor.style.height = 'auto';
		previewEl.style.height = 'auto';
		const next = resolveMatchedMarkdownPanelHeight(editor.scrollHeight, previewEl.scrollHeight);
		editor.style.height = `${next}px`;
		previewEl.style.height = `${next}px`;
	}, []);

	useLayoutEffect(() => {
		if (beside) syncMatchedHeights();
	});

	useEffect(() => {
		if (!beside) return;
		const previewEl = previewRef.current;
		if (!previewEl) return;
		const observer = new ResizeObserver(() => {
			requestAnimationFrame(syncMatchedHeights);
		});
		observer.observe(previewEl);
		return () => observer.disconnect();
	}, [beside, syncMatchedHeights]);

	const setEditorRef = (node: HTMLTextAreaElement | null) => {
		editorRef.current = node;
		assignRef(textareaRef, node);
	};

	const matchedPanelStyle = {
		minHeight: MARKDOWN_PANEL_MIN_PX,
		maxHeight: MARKDOWN_PANEL_MAX_PX,
	} as const;

	if (beside) {
		return (
			<div className="grid grid-cols-1 gap-x-4 gap-y-2 lg:grid-cols-2">
				<Label htmlFor={id} className="lg:col-start-1 lg:row-start-1">
					{label}
				</Label>
				<Label className="hidden lg:col-start-2 lg:row-start-1 lg:block">Voorvertoning</Label>

				<div className="lg:col-span-2 grid grid-cols-1 gap-4 lg:grid-cols-2">
					<Textarea
						id={id}
						ref={setEditorRef}
						value={value}
						onChange={(e) => {
							onChange(e.target.value);
							requestAnimationFrame(syncMatchedHeights);
						}}
						disabled={disabled}
						placeholder={placeholder}
						className="font-mono text-sm resize-none overflow-y-auto"
						style={matchedPanelStyle}
					/>
					<div className="flex flex-col gap-2">
						<Label className="lg:hidden">Voorvertoning</Label>
						<MarkdownPreviewPanel preview={preview} panelRef={previewRef} style={matchedPanelStyle} />
					</div>
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
					className="font-mono text-sm min-h-[12.5rem] max-h-[28rem] overflow-y-auto"
				/>
			</div>
			{showPreview && (
				<div className="space-y-2">
					<Label>Voorvertoning</Label>
					<MarkdownPreviewPanel preview={preview} className="min-h-[12.5rem] max-h-[28rem]" />
				</div>
			)}
		</div>
	);
}
