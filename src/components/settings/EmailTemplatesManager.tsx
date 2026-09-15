import { useEffect, useState } from 'react';
import { LuChevronDown, LuChevronRight } from 'react-icons/lu';
import { toast } from 'sonner';
import { TemplateEditorForm } from '@/components/settings/TemplateEditorForm';
import { useTemplateEditor } from '@/components/settings/useTemplateEditor';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import {
	buildEmailTemplateRowsMap,
	type EmailTemplateRow,
	getEmailTemplateStatusClassName,
	getEmailTemplateStatusLabel,
	toggleEmailTemplateActiveKey,
} from '@/lib/email/emailTemplateManagerHelpers';
import { type EmailEventDefinition, listEmailEvents } from '@/lib/email/events';

function TemplateEditorBody({
	event,
	row,
	onSaved,
}: {
	event: EmailEventDefinition;
	row: EmailTemplateRow;
	onSaved: (r: EmailTemplateRow) => void;
}) {
	const vm = useTemplateEditor({ event, row, onSaved });
	return <TemplateEditorForm vm={vm} />;
}

export function EmailTemplatesManager() {
	const events = listEmailEvents();
	const [rows, setRows] = useState<Record<string, EmailTemplateRow> | null>(null);
	const [activeKey, setActiveKey] = useState<string | null>(null);

	useEffect(() => {
		void (async () => {
			const { data, error } = await supabase
				.from('email_templates')
				.select('event_key, subject, body_html, is_enabled');
			if (error) {
				toast.error('Kon templates niet laden');
				console.error(error);
				return;
			}
			setRows(buildEmailTemplateRowsMap((data ?? []) as EmailTemplateRow[]));
		})();
	}, []);

	if (!rows) return <Skeleton className="h-64 w-full" />;

	return (
		<div className="space-y-3">
			{events.map((event) => {
				const row = rows[event.key];
				const isOpen = activeKey === event.key;

				if (!row) {
					return (
						<Card key={event.key}>
							<CardHeader>
								<CardTitle>{event.label}</CardTitle>
								<CardDescription>
									Geen template-rij in de database voor <code>{event.key}</code>. Voeg deze toe via
									een migratie.
								</CardDescription>
							</CardHeader>
						</Card>
					);
				}

				return (
					<Card key={event.key}>
						<button
							type="button"
							onClick={() => setActiveKey(toggleEmailTemplateActiveKey(activeKey, event.key))}
							className="w-full text-left"
							aria-expanded={isOpen}
						>
							<CardHeader className="hover:bg-accent transition-colors rounded-t-lg">
								<div className="flex items-start justify-between gap-4">
									<div className="flex items-start gap-3 min-w-0">
										{isOpen ? (
											<LuChevronDown className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
										) : (
											<LuChevronRight className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
										)}
										<div className="min-w-0">
											<CardTitle>{event.label}</CardTitle>
											<CardDescription>{event.description}</CardDescription>
										</div>
									</div>
									<span
										className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${getEmailTemplateStatusClassName(row.is_enabled)}`}
									>
										{getEmailTemplateStatusLabel(row.is_enabled)}
									</span>
								</div>
							</CardHeader>
						</button>
						{isOpen && (
							<TemplateEditorBody
								event={event}
								row={row}
								onSaved={(savedRow) => setRows((prev) => ({ ...(prev ?? {}), [event.key]: savedRow }))}
							/>
						)}
					</Card>
				);
			})}
		</div>
	);
}
