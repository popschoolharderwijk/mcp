import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { TemplateEditorForm } from '@/components/settings/TemplateEditorForm';
import { useTemplateEditor } from '@/components/settings/useTemplateEditor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SectionSkeleton } from '@/components/ui/page-skeleton';
import { supabase } from '@/integrations/supabase/client';
import { buildEmailTemplateRowsMap, type EmailTemplateRow } from '@/lib/email/emailTemplateManagerHelpers';
import { buildEmailTemplatesColumns, type EmailTemplateTableRow } from '@/lib/email/emailTemplatesTableColumns';
import { type EmailEventDefinition, listEmailEvents } from '@/lib/email/events';

const EMAIL_TEMPLATE_COLUMNS = buildEmailTemplatesColumns();

function buildEmailTemplateTableRows(
	events: EmailEventDefinition[],
	rows: Record<string, EmailTemplateRow> | null,
): EmailTemplateTableRow[] {
	return events.map((event) => {
		const row = rows?.[event.key];
		return {
			event,
			subject: row?.subject ?? '',
			hasRow: Boolean(row),
		};
	});
}

function resolveEditingEmailTemplate(
	events: EmailEventDefinition[],
	rows: Record<string, EmailTemplateRow>,
	editingEventKey: string | null,
): { event: EmailEventDefinition; row: EmailTemplateRow } | null {
	const event = events.find((e) => e.key === editingEventKey);
	const row = editingEventKey ? rows[editingEventKey] : undefined;
	return event && row ? { event, row } : null;
}

interface EmailTemplatesManagerProps {
	canEdit: boolean;
}

function TemplateEditorDialogBody({
	event,
	row,
	canEdit,
	onSaved,
	onCancel,
}: {
	event: EmailEventDefinition;
	row: EmailTemplateRow;
	canEdit: boolean;
	onSaved: (r: EmailTemplateRow) => void;
	onCancel: () => void;
}) {
	const vm = useTemplateEditor({ event, row, onSaved, onCancel, canEdit });
	return <TemplateEditorForm vm={vm} />;
}

function EmailTemplateEditorDialog({
	events,
	rows,
	editingEventKey,
	canEdit,
	onClose,
	onSaved,
}: {
	events: EmailEventDefinition[];
	rows: Record<string, EmailTemplateRow>;
	editingEventKey: string | null;
	canEdit: boolean;
	onClose: () => void;
	onSaved: (saved: EmailTemplateRow) => void;
}) {
	const editing = resolveEditingEmailTemplate(events, rows, editingEventKey);
	return (
		<Dialog
			open={editing !== null}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{editing?.event.label ?? 'E-mailtemplate'}</DialogTitle>
				</DialogHeader>
				{editing !== null && (
					<TemplateEditorDialogBody
						event={editing.event}
						row={editing.row}
						canEdit={canEdit}
						onCancel={onClose}
						onSaved={onSaved}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

async function loadEmailTemplateRows(): Promise<Record<string, EmailTemplateRow> | null> {
	const { data, error } = await supabase.from('email_templates').select('event_key, subject, body_markdown');
	if (error) {
		toast.error('Kon templates niet laden');
		console.error(error);
		return null;
	}
	return buildEmailTemplateRowsMap(data ?? []);
}

export function EmailTemplatesManager({ canEdit }: EmailTemplatesManagerProps) {
	const events = listEmailEvents();
	const [rows, setRows] = useState<Record<string, EmailTemplateRow> | null>(null);
	const [searchQuery, setSearchQuery] = useState('');
	const [editingEventKey, setEditingEventKey] = useState<string | null>(null);

	useEffect(() => {
		void loadEmailTemplateRows().then((next) => {
			if (next) setRows(next);
		});
	}, []);

	const tableRows = useMemo(() => buildEmailTemplateTableRows(events, rows), [events, rows]);

	if (!rows) {
		return <SectionSkeleton />;
	}

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle>E-mailtemplates</CardTitle>
					<CardDescription>Beheer de inhoud van automatische e-mails (Markdown).</CardDescription>
				</CardHeader>
				<CardContent>
					<DataTable
						data={tableRows}
						columns={EMAIL_TEMPLATE_COLUMNS}
						searchQuery={searchQuery}
						onSearchChange={setSearchQuery}
						searchFields={[(row) => row.event.label, (row) => row.event.description]}
						getRowKey={(row) => row.event.key}
						emptyMessage="Geen e-mailtemplates gevonden."
						initialSortColumn="label"
						initialSortDirection="asc"
						paginated={false}
						rowActions={{
							onEdit: (row) => {
								if (row.hasRow) setEditingEventKey(row.event.key);
							},
						}}
					/>
				</CardContent>
			</Card>

			<EmailTemplateEditorDialog
				events={events}
				rows={rows}
				editingEventKey={editingEventKey}
				canEdit={canEdit}
				onClose={() => setEditingEventKey(null)}
				onSaved={(saved) => {
					setRows((prev) => (prev ? { ...prev, [saved.event_key]: saved } : prev));
				}}
			/>
		</>
	);
}
