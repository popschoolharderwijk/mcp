export interface EmailTemplateRow {
	event_key: string;
	subject: string;
	body_markdown: string;
}

export interface EmailTemplateEditorState {
	subject: string;
	body_markdown: string;
}

export function renderEmailTemplatePreview(template: string, vars: Record<string, string>): string {
	return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
		const value = vars[key];
		return value !== undefined ? value : match;
	});
}

export function buildEmailTemplateRowsMap(rows: EmailTemplateRow[]): Record<string, EmailTemplateRow> {
	const map: Record<string, EmailTemplateRow> = {};
	for (const row of rows) {
		map[row.event_key] = row;
	}
	return map;
}

export function mergeSavedEmailTemplateRow(row: EmailTemplateRow, editor: EmailTemplateEditorState): EmailTemplateRow {
	return {
		...row,
		subject: editor.subject,
		body_markdown: editor.body_markdown,
	};
}
