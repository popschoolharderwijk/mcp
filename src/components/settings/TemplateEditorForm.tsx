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

function TemplateEditorSubjectField({ vm }: TemplateEditorFormProps) {
	const { event, subject, previewSubject, canEdit, setSubject } = vm;
	return (
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
	);
}

function TemplateEditorVariables({ vm, onInsert }: TemplateEditorFormProps & { onInsert: (variable: string) => void }) {
	const { event, canEdit } = vm;
	return (
		<div>
			<Label className="text-xs text-muted-foreground">Beschikbare variabelen</Label>
			<div className="mt-1 flex flex-wrap gap-1.5">
				{event.variables.map((variable) => (
					<button
						key={variable}
						type="button"
						disabled={!canEdit}
						onClick={() => onInsert(variable)}
						className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs hover:bg-accent disabled:opacity-50 disabled:pointer-events-none"
						title={`Invoegen: {{${variable}}}`}
					>
						{`{{${variable}}}`}
					</button>
				))}
			</div>
		</div>
	);
}

function TemplateEditorTestMail({ vm }: TemplateEditorFormProps) {
	const { event, testEmail, sendingTest, canEdit, setTestEmail, handleSendTest } = vm;
	return (
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
					<Button variant="outline" onClick={() => void handleSendTest()} disabled={!canEdit || sendingTest}>
						<LuMail className="mr-2 h-4 w-4" />
						{sendingTest ? 'Versturen…' : 'Verstuur testmail'}
					</Button>
				</div>
			</div>
		</div>
	);
}

function TemplateEditorReadonlyNotice() {
	return (
		<p className="border-t pt-4 text-sm text-muted-foreground">
			Alleen een sitebeheerder kan e-mailtemplates wijzigen.
		</p>
	);
}

function TemplateEditorEditActions({ vm }: TemplateEditorFormProps) {
	const { saving, isDirty, isAtBootstrap, handleSave, handleReset, handleCancel } = vm;
	const resetDisabled = saving || isAtBootstrap;
	const saveDisabled = saving || !isDirty;
	return (
		<div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
			<Button type="button" variant="outline" onClick={handleReset} disabled={resetDisabled}>
				Herstellen
			</Button>
			<div className="flex flex-wrap gap-2">
				<Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>
					Annuleren
				</Button>
				<Button type="button" onClick={() => void handleSave()} disabled={saveDisabled}>
					{saving ? <LuLoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
					Opslaan
				</Button>
			</div>
		</div>
	);
}

function TemplateEditorActions({ vm }: TemplateEditorFormProps) {
	if (!vm.canEdit) return <TemplateEditorReadonlyNotice />;
	return <TemplateEditorEditActions vm={vm} />;
}

export function TemplateEditorForm({ vm }: TemplateEditorFormProps) {
	const { event, bodyMarkdown, canEdit, setBodyMarkdown } = vm;
	const bodyRef = useRef<HTMLTextAreaElement>(null);

	const insertVariable = (variable: string) => {
		if (!canEdit) return;
		const { nextValue, caret } = insertSnippetIntoTextarea(bodyRef.current, bodyMarkdown, `{{${variable}}}`);
		setBodyMarkdown(nextValue);
		requestAnimationFrame(() => {
			const field = bodyRef.current;
			if (!field) return;
			field.focus();
			field.setSelectionRange(caret, caret);
		});
	};

	return (
		<div className="space-y-4">
			<TemplateEditorSubjectField vm={vm} />
			<MarkdownBodyField
				id={`body-${event.key}`}
				value={bodyMarkdown}
				onChange={setBodyMarkdown}
				disabled={!canEdit}
				previewSource={vm.previewBody}
				previewPlacement="beside"
				textareaRef={bodyRef}
			/>
			<TemplateEditorVariables vm={vm} onInsert={insertVariable} />
			<TemplateEditorTestMail vm={vm} />
			<TemplateEditorActions vm={vm} />
		</div>
	);
}
