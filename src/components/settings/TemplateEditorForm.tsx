import { useRef } from 'react';
import { LuLoaderCircle, LuMail } from 'react-icons/lu';
import type { TemplateEditorViewModel } from '@/components/settings/useTemplateEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MarkdownBodyField } from '@/components/ui/markdown-body-field';
import { insertSnippetIntoTextarea } from '@/lib/text/insertTextAtCursorHelpers';

interface TemplateEditorFormProps {
	vm: TemplateEditorViewModel;
}

export function TemplateEditorForm({ vm }: TemplateEditorFormProps) {
	const {
		event,
		subject,
		bodyMarkdown,
		saving,
		testEmail,
		sendingTest,
		previewSubject,
		previewBody,
		canEdit,
		isDirty,
		isAtBootstrap,
		setSubject,
		setBodyMarkdown,
		setTestEmail,
		handleSave,
		handleReset,
		handleCancel,
		handleSendTest,
	} = vm;
	const bodyRef = useRef<HTMLTextAreaElement>(null);

	const insertVariable = (variable: string) => {
		if (!canEdit) return;
		const snippet = `{{${variable}}}`;
		const { nextValue, caret } = insertSnippetIntoTextarea(bodyRef.current, bodyMarkdown, snippet);
		setBodyMarkdown(nextValue);
		requestAnimationFrame(() => {
			const el = bodyRef.current;
			if (!el) return;
			el.focus();
			el.setSelectionRange(caret, caret);
		});
	};

	return (
		<div className="space-y-4">
			<div>
				<Label htmlFor={`subject-${event.key}`}>Onderwerp</Label>
				<Input
					id={`subject-${event.key}`}
					value={subject}
					onChange={(e) => setSubject(e.target.value)}
					disabled={!canEdit}
					className="mt-1"
				/>
				{previewSubject !== subject && (
					<p className="mt-1 text-xs text-muted-foreground">Preview: {previewSubject}</p>
				)}
			</div>

			<MarkdownBodyField
				id={`body-${event.key}`}
				value={bodyMarkdown}
				onChange={setBodyMarkdown}
				disabled={!canEdit}
				previewSource={previewBody}
				previewPlacement="beside"
				textareaRef={bodyRef}
			/>

			<div>
				<Label className="text-xs text-muted-foreground">Beschikbare variabelen</Label>
				<div className="mt-1 flex flex-wrap gap-1.5">
					{event.variables.map((variable) => (
						<button
							key={variable}
							type="button"
							disabled={!canEdit}
							onClick={() => insertVariable(variable)}
							className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs hover:bg-accent disabled:opacity-50 disabled:pointer-events-none"
							title={`Invoegen: {{${variable}}}`}
						>
							{`{{${variable}}}`}
						</button>
					))}
				</div>
			</div>

			<div className="flex flex-wrap items-end gap-3 pt-2">
				<div>
					<Label htmlFor={`test-${event.key}`} className="text-xs">
						Testmail naar
					</Label>
					<div className="mt-1 flex flex-wrap items-center gap-2">
						<Input
							id={`test-${event.key}`}
							type="email"
							value={testEmail}
							onChange={(e) => setTestEmail(e.target.value)}
							disabled={!canEdit}
							className="w-64"
						/>
						<Button
							variant="outline"
							onClick={() => void handleSendTest()}
							disabled={!canEdit || sendingTest}
						>
							<LuMail className="mr-2 h-4 w-4" />
							{sendingTest ? 'Versturen…' : 'Verstuur testmail'}
						</Button>
					</div>
				</div>
			</div>

			{canEdit ? (
				<div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
					<Button type="button" variant="outline" onClick={handleReset} disabled={saving || isAtBootstrap}>
						Herstellen
					</Button>
					<div className="flex flex-wrap gap-2">
						<Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>
							Annuleren
						</Button>
						<Button type="button" onClick={() => void handleSave()} disabled={saving || !isDirty}>
							{saving && <LuLoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
							Opslaan
						</Button>
					</div>
				</div>
			) : (
				<p className="border-t pt-4 text-sm text-muted-foreground">
					Alleen een sitebeheerder kan e-mailtemplates wijzigen.
				</p>
			)}
		</div>
	);
}
