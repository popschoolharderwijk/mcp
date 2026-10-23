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

export function EmailTemplatesManager({ canEdit }: EmailTemplatesManagerProps) {
	const events = listEmailEvents();
	const [rows, setRows] = useState<Record<string, EmailTemplateRow> | null>(null);
	const [searchQuery, setSearchQuery] = useState('');
	const [editingEventKey, setEditingEventKey] = useState<string | null>(null);

	useEffect(() => {
		void (async () => {
			const { data, error } = await supabase
				.from('email_templates')
				.select('event_key, subject, body_markdown');
			if (error) {
				toast.error('Kon templates niet laden');
				console.error(error);
				return;
			}
			setRows(buildEmailTemplateRowsMap((data ?? []) as EmailTemplateRow[]));
		})();
	}, []);

	const tableRows: EmailTemplateTableRow[] = useMemo(
		() =>
			events.map((event) => {
				const row = rows?.[event.key];
				return {
					event,
					subject: row?.subject ?? '',
					hasRow: Boolean(row),
				};
			}),
		[events, rows],
	);

	const editingEvent = editingEventKey ? events.find((e) => e.key === editingEventKey) : undefined;
	const editingRow = editingEventKey && rows ? rows[editingEventKey] : undefined;

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

			<Dialog
				open={Boolean(editingEvent && editingRow)}
				onOpenChange={(open) => {
					if (!open) setEditingEventKey(null);
				}}
			>
				<DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{editingEvent?.label ?? 'E-mailtemplate'}</DialogTitle>
					</DialogHeader>
					{editingEvent && editingRow && (
						<TemplateEditorDialogBody
							event={editingEvent}
							row={editingRow}
							canEdit={canEdit}
							onCancel={() => setEditingEventKey(null)}
							onSaved={(saved) => {
								setRows((prev) => (prev ? { ...prev, [saved.event_key]: saved } : prev));
							}}
						/>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
