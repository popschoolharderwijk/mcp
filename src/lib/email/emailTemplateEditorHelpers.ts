import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
	type EmailTemplateEditorState,
	type EmailTemplateRow,
	mergeSavedEmailTemplateRow,
} from '@/lib/email/emailTemplateManagerHelpers';

export function buildEmailTemplateEditorStateFromRow(row: EmailTemplateRow): EmailTemplateEditorState {
	return {
		subject: row.subject,
		body_markdown: row.body_markdown,
	};
}

export async function saveEmailTemplateForEvent(
	eventKey: string,
	editor: EmailTemplateEditorState,
	row: EmailTemplateRow,
): Promise<EmailTemplateRow | null> {
	const { error } = await supabase
		.from('email_templates')
		.update({
			subject: editor.subject,
			body_markdown: editor.body_markdown,
		})
		.eq('event_key', eventKey);

	if (error) {
		toast.error('Opslaan mislukt');
		console.error(error);
		return null;
	}

	toast.success('Template opgeslagen');
	return mergeSavedEmailTemplateRow(row, editor);
}

export async function sendTestEmailForTemplate(
	eventKey: string,
	testEmail: string,
	previewData: Record<string, string>,
): Promise<boolean> {
	if (!testEmail) {
		toast.error('Vul een testadres in');
		return false;
	}

	const { error } = await supabase.functions.invoke('send-template-email', {
		body: {
			event_key: eventKey,
			to: testEmail,
			vars: previewData,
		},
	});

	if (error) {
		toast.error('Versturen mislukt');
		console.error(error);
		return false;
	}

	toast.success(`Testmail verstuurd naar ${testEmail}`);
	return true;
}
