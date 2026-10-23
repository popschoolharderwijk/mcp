import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
	getEmailTemplateBootstrap,
	isEmailTemplateEditorAtBootstrap,
	isEmailTemplateEditorDirty,
} from '@/lib/email/emailTemplateDefaults';
import {
	buildEmailTemplateEditorStateFromRow,
	saveEmailTemplateForEvent,
	sendTestEmailForTemplate,
} from '@/lib/email/emailTemplateEditorHelpers';
import { type EmailTemplateRow, renderEmailTemplatePreview } from '@/lib/email/emailTemplateManagerHelpers';
import type { EmailEventDefinition } from '@/lib/email/events';

interface UseTemplateEditorParams {
	event: EmailEventDefinition;
	row: EmailTemplateRow;
	onSaved: (row: EmailTemplateRow) => void;
	onCancel: () => void;
	canEdit: boolean;
}

export function useTemplateEditor({ event, row, onSaved, onCancel, canEdit }: UseTemplateEditorParams) {
	const { user } = useAuth();
	const [subject, setSubject] = useState(row.subject);
	const [bodyMarkdown, setBodyMarkdown] = useState(row.body_markdown);
	const [saving, setSaving] = useState(false);
	const [testEmail, setTestEmail] = useState(user?.email ?? '');
	const [sendingTest, setSendingTest] = useState(false);

	useEffect(() => {
		const editorState = buildEmailTemplateEditorStateFromRow(row);
		setSubject(editorState.subject);
		setBodyMarkdown(editorState.body_markdown);
	}, [row]);

	const editorState = { subject, body_markdown: bodyMarkdown };
	const isDirty = isEmailTemplateEditorDirty(editorState, row);
	const isAtBootstrap = isEmailTemplateEditorAtBootstrap(editorState, event.key);
	const previewSubject = renderEmailTemplatePreview(subject, event.previewData);
	const previewBody = renderEmailTemplatePreview(bodyMarkdown, event.previewData);

	const handleSave = async () => {
		if (!canEdit || !isDirty) return;
		setSaving(true);
		const savedRow = await saveEmailTemplateForEvent(event.key, editorState, row);
		setSaving(false);
		if (savedRow) onSaved(savedRow);
	};

	const handleReset = () => {
		if (!canEdit) return;
		const defaults = getEmailTemplateBootstrap(event.key);
		if (!defaults) return;
		setSubject(defaults.subject);
		setBodyMarkdown(defaults.body_markdown);
	};

	const handleSendTest = async () => {
		if (!canEdit) return;
		setSendingTest(true);
		await sendTestEmailForTemplate(event.key, testEmail, event.previewData);
		setSendingTest(false);
	};

	return {
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
		handleCancel: onCancel,
		handleSendTest,
	};
}

export type TemplateEditorViewModel = ReturnType<typeof useTemplateEditor>;
