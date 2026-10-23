import type { DataTableColumn } from '@/components/ui/data-table';
import type { EmailEventDefinition } from '@/lib/email/events';

export interface EmailTemplateTableRow {
	event: EmailEventDefinition;
	subject: string;
	hasRow: boolean;
}

export function buildEmailTemplatesColumns(): DataTableColumn<EmailTemplateTableRow>[] {
	return [
		{
			key: 'label',
			label: 'Template',
			sortValue: (row) => row.event.label,
			render: (row) => <span className="font-medium">{row.event.label}</span>,
		},
		{
			key: 'description',
			label: 'Beschrijving',
			sortable: false,
			render: (row) => (
				<span className="text-muted-foreground line-clamp-2 text-sm">{row.event.description}</span>
			),
		},
		{
			key: 'subject',
			label: 'Onderwerp',
			sortValue: (row) => row.subject,
			render: (row) =>
				row.hasRow ? (
					<span className="line-clamp-1 text-sm">{row.subject}</span>
				) : (
					<span className="text-xs text-destructive">Ontbreekt in database</span>
				),
		},
	];
}
